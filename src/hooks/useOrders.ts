import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { generateOrderNumber } from '../utils/orderUtils';
import { branches } from '../data/branches';
import type { Order } from '../types/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to orders from Firebase with error handling
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const ordersData: Order[] = [];
        snapshot.forEach((doc) => {
          ordersData.push({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
          } as Order);
        });
        setOrders(ordersData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please check your connection and try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getNextSequenceNumber = async (branchId: string, orderDate: string) => {
    const date = new Date(orderDate);
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    // Query orders for this branch and date
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      where('branchId', '==', branchId),
      where('orderDate', '>=', startOfDay.toISOString()),
      where('orderDate', '<', endOfDay.toISOString())
    );

    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  };

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

      // Prepare order data with proper timestamps
      const order = {
        ...orderData,
        orderNumber,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        orderDate: new Date(orderData.orderDate).toISOString(),
        products: orderData.products.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          producedQuantity: 0
        }))
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), order);
      
      return {
        id: docRef.id,
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
      await updateDoc(orderRef, {
        ...orderData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof Error ? error : new Error('Failed to update order');
    }
  }, []);

  const removeOrder = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ORDERS, id));
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
        productionStartDate: startDate,
        productionEndDate: endDate,
        updatedAt: serverTimestamp()
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