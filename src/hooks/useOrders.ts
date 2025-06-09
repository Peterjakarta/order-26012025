import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  setDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { generateOrderNumber } from '../utils/orderUtils';
import { branches } from '../data/branches';
import type { Order, Recipe } from '../types/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Add subscription cleanup flag
  const subscriptionRef = useRef<(() => void) | null>(null);
  const didInitializeRef = useRef(false);

  // This effect runs when refreshCounter changes, forcing a data reload
  useEffect(() => {
    setLoading(true);
    setError(null);
    let isMounted = true;

    // Clean up previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }

    // Flag to indicate we've set up the subscription
    didInitializeRef.current = true;

    try {
      // Create a more robust query with proper ordering
      const q = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('updatedAt', 'desc')
      );

      console.log(`Setting up orders subscription (refresh #${refreshCounter})`);

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
                productionEndDate: data.productionEndDate,
                stockReduced: data.stockReduced || false,
                isRDProduct: data.isRDProduct || false,
                rdProductData: data.rdProductData
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

  }, [refreshCounter]); // Add refreshCounter to trigger this effect when needed

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
      const orderId = orderData.isRDProduct ? 
        `rd-${Date.now()}` : 
        `${orderData.branchId}-${Date.now()}`;

      // Prepare order data with proper timestamps
      const now = serverTimestamp();
      const order = {
        ...orderData,
        orderNumber,
        status: orderData.isRDProduct ? 'processing' : 'pending',
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
      
      // Force refresh after adding
      setRefreshCounter(prev => prev + 1);
      
      return {
        id: orderId,
        ...orderData,
        orderNumber,
        status: orderData.isRDProduct ? 'processing' : 'pending',
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
        updatedAt: now
      });
      
      // Force refresh after updating
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof Error ? error : new Error('Failed to update order');
    }
  }, []);

  const removeOrder = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ORDERS, id));
      
      // Force refresh after removing
      setRefreshCounter(prev => prev + 1);
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
    rejectNotes?: Record<string, string>,
    deliveryDate?: string,
    productionDate?: string
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
          producedQuantity: producedQuantities?.[item.productId] || item.producedQuantity || 0,
          stockQuantity: stockQuantities?.[item.productId] || item.stockQuantity || 0,
          rejectQuantity: rejectQuantities?.[item.productId] || item.rejectQuantity || 0,
          rejectNotes: rejectNotes?.[item.productId] || item.rejectNotes || ''
        }));

        updateData.products = updatedProducts;
      }

      // Update status and completedAt/productionDate
      if (status === 'completed') {
        updateData.status = status;
        if (productionDate) {
          updateData.completedAt = new Date(productionDate);
        } else {
          updateData.completedAt = serverTimestamp();
        }
      } else {
        updateData.status = status;
        // Clear completedAt if moving back from completed
        if (orderDoc.status === 'completed') {
          updateData.completedAt = null;
        }
      }
      
      // Update delivery date if provided
      if (deliveryDate) {
        updateData.deliveryDate = deliveryDate;
      }

      await updateDoc(orderRef, updateData);
      
      // Force refresh after updating status
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error instanceof Error ? error : new Error('Failed to update order status');
    }
  }, [orders]);

  const updateStockReduction = useCallback(async (orderId: string, reduced: boolean) => {
    try {
      const orderDoc = orders.find(o => o.id === orderId);
      if (!orderDoc) throw new Error('Order not found');

      // First get all recipes for the products in the order
      const recipesSnapshot = await getDocs(collection(db, COLLECTIONS.RECIPES));
      const recipes = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Recipe[];

      const batch = writeBatch(db);
      
      // Update order status
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      batch.update(orderRef, {
        stockReduced: reduced,
        updatedAt: serverTimestamp()
      });

      // Track all ingredient changes
      const ingredientChanges: Record<string, { amount: number, previousQuantity: number }> = {};

      // Calculate ingredient usage based on recipes
      for (const product of orderDoc.products) {
        const recipe = recipes.find(r => r.productId === product.productId);
        if (!recipe) {
          console.warn(`No recipe found for product ${product.productId}`);
          continue;
        }

        const scale = (product.producedQuantity || product.quantity) / recipe.yield;

        // Calculate ingredient amounts
        for (const ingredient of recipe.ingredients) {
          const scaledAmount = Math.ceil(ingredient.amount * scale);
          const changeAmount = reduced ? -scaledAmount : scaledAmount;

          if (!ingredientChanges[ingredient.ingredientId]) {
            // Get current stock level
            const stockRef = doc(db, COLLECTIONS.STOCK, ingredient.ingredientId);
            const stockDoc = await getDoc(stockRef);
            const currentStock = stockDoc.exists() ? stockDoc.data().quantity || 0 : 0;

            ingredientChanges[ingredient.ingredientId] = {
              amount: changeAmount,
              previousQuantity: currentStock
            };
          } else {
            ingredientChanges[ingredient.ingredientId].amount += changeAmount;
          }
        }
      }

      // Apply all ingredient changes
      for (const [ingredientId, change] of Object.entries(ingredientChanges)) {
        const newStock = Math.max(0, change.previousQuantity + change.amount);
        
        // Update stock level
        const stockRef = doc(db, COLLECTIONS.STOCK, ingredientId);
        batch.set(stockRef, {
          quantity: newStock,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add stock history entry
        const historyRef = doc(collection(db, COLLECTIONS.STOCK_HISTORY));
        batch.set(historyRef, {
          ingredientId,
          previousQuantity: change.previousQuantity,
          newQuantity: newStock,
          changeAmount: change.amount,
          changeType: reduced ? 'reduction' : 'reversion',
          orderId,
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
      
      // Force refresh after updating
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error updating stock reduction:', error);
      throw error instanceof Error ? error : new Error('Failed to update stock reduction status');
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
      
      // Force refresh after updating production details
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error updating order production:', error);
      throw error instanceof Error ? error : new Error('Failed to update production schedule');
    }
  }, []);

  // Function to manually refresh orders
  const refreshOrders = useCallback(() => {
    console.log('Manually refreshing orders data');
    setRefreshCounter(prev => prev + 1);
  }, []);

  return { 
    orders,
    loading,
    error,
    addOrder,
    updateOrder,
    removeOrder,
    updateOrderStatus,
    updateOrderProduction,
    updateStockReduction,
    refreshOrders
  };
}