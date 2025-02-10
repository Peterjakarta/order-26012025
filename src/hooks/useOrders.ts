import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { generateOrderNumber } from '../utils/orderUtils';
import { branches } from '../data/branches';
import type { Order } from '../types/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 

  // Add subscription cleanup flag
  const subscriptionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let isMounted = true;

    try {
      // Create a more robust query with proper ordering
      const q = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('updatedAt', 'desc')
      );

      // Set up new subscription
      subscriptionRef.current = onSnapshot(q, 
        (snapshot) => {
          if (!isMounted) return;

          const ordersData: Order[] = [];
          let parseErrors = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            try {
              // Ensure all required fields are present
              if (!data.branchId || !data.orderedBy || !data.orderDate) {
                console.warn('Skipping malformed order:', doc.id);
                return;
              }

              // Parse timestamps properly
              const createdAt = data.createdAt?.toDate?.() || new Date();
              const updatedAt = data.updatedAt?.toDate?.() || createdAt;
              const completedAt = data.completedAt?.toDate?.();

              ordersData.push({ 
                id: doc.id, 
                branchId: data.branchId,
                orderedBy: data.orderedBy,
                orderDate: data.orderDate,
                deliveryDate: data.deliveryDate,
                poNumber: data.poNumber,
                products: data.products || [],
                notes: data.notes,
                status: data.status || 'pending',
                orderNumber: data.orderNumber,
                createdAt: createdAt.toISOString(),
                updatedAt: updatedAt.toISOString(),
                completedAt: completedAt?.toISOString(),
                productionStartDate: data.productionStartDate,
                productionEndDate: data.productionEndDate
              } as Order);
            } catch (err) {
              console.error('Error parsing order:', doc.id, err);
              parseErrors++;
            }
          });

        // Log detailed information about the sync
        console.log(`Orders sync complete:
          - Total orders: ${ordersData.length}
          - Parse errors: ${parseErrors}
          - Timestamp: ${new Date().toISOString()}`
        );

          // Sort orders by date for consistent display
          ordersData.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          if (isMounted) {
            setOrders(ordersData);
            setLoading(false);
            setError(null);
          }
        },
        (err) => {
          if (!isMounted) return;
          console.error('Error fetching orders:', err);
          setError('Failed to load orders. Please refresh the page or check your connection.');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up orders subscription:', err);
      setError('Failed to connect to database. Please refresh the page.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };

  }, []); // Add empty dependency array

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'>) => {
    try {
      // Validate required fields
      if (!orderData.branchId) {
        throw new Error('Branch is required');
      }
      if (!orderData.orderedBy?.trim()) {
        throw new Error('Ordered by is required');
      }
      if (!orderData.products?.length) {
        throw new Error('At least one product is required');
      }

      // Validate branchId
      const validBranch = branches.find(b => b.id === orderData.branchId);
      if (!validBranch) {
        throw new Error('Invalid branch selected');
      }

      // Validate products have valid quantities
      const invalidProducts = orderData.products.filter(item => !item.quantity || item.quantity <= 0);
      if (invalidProducts.length > 0) {
        throw new Error('All products must have valid quantities');
      }

      // Generate order number
      const orderNumber = generateOrderNumber(orderData.branchId, orderData.orderDate);

      // Generate a unique ID for the order
      const orderId = `${orderData.branchId}-${Date.now()}`;

      // Prepare order data with proper timestamps
      const now = serverTimestamp();
      const order = {
        ...orderData,
        orderNumber,
        status: 'pending' as const,
        createdAt: now,
        updatedAt: now,
        orderDate: new Date(orderData.orderDate).toISOString(),
        products: orderData.products.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          producedQuantity: item.producedQuantity || 0
        }))
      };

      await setDoc(doc(db, COLLECTIONS.ORDERS, orderId), order);
      
      return {
        id: orderId,
        ...orderData,
        orderNumber,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding order:', error);
      throw error instanceof Error ? error : new Error('Failed to submit order');
    }
  }, []);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<Order>) => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const now = serverTimestamp();
      
      await updateDoc(orderRef, {
        ...orderData,
        updatedAt: now,
        status: orderData.status || 'pending'
      });
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof Error ? error : new Error('Failed to update order');
    }
  }, []);

  const removeOrder = useCallback(async (id: string) => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, id);
      await deleteDoc(orderRef);
    } catch (error) {
      console.error('Error removing order:', error);
      throw error instanceof Error ? error : new Error('Failed to remove order');
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: Order['status'],
    producedQuantities?: Record<string, number>,
    stockQuantities?: Record<string, number>,
    rejectQuantities?: Record<string, number>,
    rejectNotes?: Record<string, string>
  ) => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const orderDoc = orders.find(o => o.id === orderId);
      if (!orderDoc) throw new Error('Order not found');
      console.log('Updating order status:', orderId, status);

      const updateData: any = {
        updatedAt: serverTimestamp()
      };

      if (producedQuantities || stockQuantities || rejectQuantities || rejectNotes) {
        // Update quantities and notes
        const updatedProducts = orderDoc.products.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          producedQuantity: producedQuantities?.[item.productId] || 0,
          stockQuantity: stockQuantities?.[item.productId] || 0,
          rejectQuantity: rejectQuantities?.[item.productId] || 0,
          rejectNotes: rejectNotes?.[item.productId] || ''
        }));

        updateData.products = updatedProducts;
      }

      // Only update status and completedAt if status is changing to completed
      if (status === 'completed' && orderDoc.status !== 'completed') {
        updateData.status = status;
        updateData.completedAt = serverTimestamp();
      } else if (status !== 'completed') {
        updateData.status = status;
        // Clear completedAt if moving back from completed
        if (orderDoc.status === 'completed') {
          updateData.completedAt = null;
        }
      }

      await updateDoc(orderRef, updateData);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof Error ? error : new Error('Failed to update order status');
    }
  }, [orders]);

  const updateOrderProduction = useCallback(async (
    orderId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      await updateDoc(orderRef, {
        status: 'processing',
        updatedAt: serverTimestamp(),
        productionStartDate: startDate,
        productionEndDate: endDate,
      });
    } catch (error) {
      console.error('Error updating order production:', error);
      throw error instanceof Error ? error : new Error('Failed to update production schedule');
    }
  }, []);

  return { 
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    removeOrder,
    updateOrderStatus,
    updateOrderProduction
  };
}