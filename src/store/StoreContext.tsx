import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  setDoc, 
  onSnapshot,
  writeBatch,
  where,
  serverTimestamp,
  limit,
  getDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { categories as initialCategories } from '../data/categories';
import type { Product, ProductCategory, CategoryData, Ingredient, Recipe, StockLevel, StockHistory } from '../types/types';
import { auth } from '../lib/firebase';

interface StoreState {
  products: Product[];
  categories: Record<ProductCategory, CategoryData>;
  categoryOrder: ProductCategory[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  stockLevels: Record<string, StockLevel>;
  stockHistory: StockHistory[];
}

interface StoreContextType extends StoreState {
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateCategory: (category: ProductCategory, data: CategoryData) => Promise<void>;
  addCategory: (id: string, data: CategoryData) => Promise<void>;
  deleteCategory: (category: ProductCategory) => Promise<void>;
  reorderCategories: (newOrder: ProductCategory[]) => Promise<void>;
  reorderProducts: (categoryId: string, newOrder: string[]) => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => Promise<void>;
  updateIngredient: (id: string, ingredient: Omit<Ingredient, 'id'>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  updateStockLevel: (ingredientId: string, data: { 
    quantity: number;
    minStock?: number;
    orderId?: string;
    changeType?: 'reduction' | 'reversion' | 'manual';
  }) => Promise<void>;
  getStockHistory: (ingredientId?: string) => Promise<StockHistory[]>;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Omit<Recipe, 'id'>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getProductsByCategory: (category: string) => Product[];
}

const StoreContext = createContext<StoreContextType | null>(null);

function validateProduct(data: any): Omit<Product, 'id'> {
  return {
    name: String(data.name || ''),
    category: String(data.category || ''),
    description: String(data.description || ''),
    unit: String(data.unit || ''),
    minOrder: Number(data.minOrder) || 0,
    price: Number(data.price) || 0,
    quantityStep: data.quantityStep ? Number(data.quantityStep) : undefined,
    showPrice: Boolean(data.showPrice),
    showDescription: Boolean(data.showDescription),
    showUnit: Boolean(data.showUnit),
    showMinOrder: Boolean(data.showMinOrder)
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(() => ({
    categories: initialCategories,
    categoryOrder: Object.keys(initialCategories),
    products: [],
    ingredients: [],
    recipes: [],
    stockLevels: {} as Record<string, StockLevel>,
    stockHistory: [],
    stockReductionHistory: {} as Record<string, boolean>
  }));

  // Subscribe to stock reduction history from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.STOCK_HISTORY));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reductionHistory: Record<string, boolean> = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.orderId && data.changeType === 'reduction') {
          reductionHistory[data.orderId] = true;
        }
      });
      
      setState(prev => ({ ...prev, stockReductionHistory: reductionHistory }));
    });

    return () => unsubscribe();
  }, []);
  // Subscribe to stock history from Firebase
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.STOCK_HISTORY),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData: StockHistory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        historyData.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        } as StockHistory);
      });
      setState(prev => ({ ...prev, stockHistory: historyData }));
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to stock levels from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.STOCK));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stockData: Record<string, StockLevel> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        stockData[doc.id] = {
          quantity: data.quantity || 0,
          minStock: data.minStock,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        };
      });
      setState(prev => ({ ...prev, stockLevels: stockData }));
    });

    return () => unsubscribe();
  }, []);

  const updateStockLevel = useCallback(async (ingredientId: string, data: {
    quantity: number;
    minStock?: number;
    orderId?: string;
    changeType?: 'reduction' | 'reversion' | 'manual';
  }) => {
    try {
      // Validate input data
      if (typeof data.quantity !== 'number' || !Number.isFinite(data.quantity)) {
        throw new Error('Invalid quantity value');
      }

      if (data.minStock !== undefined && 
          (typeof data.minStock !== 'number' || !Number.isFinite(data.minStock))) {
        throw new Error('Invalid minimum stock value');
      }

      // Validate ingredient exists first
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      const ingredientDoc = await getDoc(ingredientRef);
      if (!ingredientDoc.exists()) {
        throw new Error('Ingredient not found');
      }

      // Get current stock level first
      const stockRef = doc(db, COLLECTIONS.STOCK, ingredientId);
      const stockDoc = await getDoc(stockRef);
      const currentStock = stockDoc.exists() ? stockDoc.data().quantity || 0 : 0;
      
      // Round quantities up to whole numbers
      const newQuantity = Math.ceil(Math.max(0, Number(data.quantity)));
      const minStock = data.minStock === undefined ? undefined : Math.ceil(Math.max(0, Number(data.minStock)));
      
      // Validate the change amount (allow larger changes but prevent unreasonable ones)
      const changeAmount = Math.abs(newQuantity - currentStock);
      if (changeAmount > 100000) { // Increased limit for bulk operations
        throw new Error('Stock change amount exceeds system limits (max 100,000). For larger changes, please contact support.');
      }

      // Create batch for atomic updates
      const batch = writeBatch(db);
      
      // Update stock level
      const stockData = {
        quantity: newQuantity,
        ...(minStock !== undefined && { minStock }),
        updatedAt: serverTimestamp()
      };
      batch.set(stockRef, stockData, { merge: true });
      
      // Add history entry if this is a stock change
      if (data.changeType) {
        const historyRef = doc(collection(db, COLLECTIONS.STOCK_HISTORY));
        const changeAmount = Math.ceil(newQuantity - currentStock);
        
        const historyData = {
          ingredientId,
          previousQuantity: currentStock,
          newQuantity: newQuantity,
          changeAmount: changeAmount,
          changeType: data.changeType,
          timestamp: serverTimestamp(),
          userId: auth.currentUser?.uid || 'system'
        };

        // Only add orderId if it exists
        if (data.orderId) {
          Object.assign(historyData, { orderId: data.orderId });
        }

        batch.set(historyRef, historyData);
      }
      
      await batch.commit();
    } catch (error) {
      // Log detailed error information
      console.error('Error updating stock level:', {
        ingredientId,
        data,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
      throw error;
    }
  }, [state.stockLevels]);

  const getStockHistory = useCallback(async (ingredientId?: string) => {
    try {
      let q = query(
        collection(db, COLLECTIONS.STOCK_HISTORY),
        orderBy('timestamp', 'desc')
      );
      
      if (ingredientId) {
        q = query(q, where('ingredientId', '==', ingredientId));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as StockHistory[];
    } catch (error) {
      console.error('Error getting stock history:', error);
      throw new Error('Failed to get stock history');
    }
  }, []);

  // Subscribe to categories from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData: Record<ProductCategory, CategoryData> = {};
      const categoryOrder: ProductCategory[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as CategoryData & { order: number };
        categoriesData[doc.id] = {
          name: data.name
        };
        categoryOrder.push(doc.id);
      });

      setState(prev => ({
        ...prev,
        categories: categoriesData,
        categoryOrder
      }));
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to products from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setState(prev => ({ ...prev, products: productsData }));
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to ingredients from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.INGREDIENTS), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ingredientsData: Ingredient[] = [];
      snapshot.forEach((doc) => {
        ingredientsData.push({ id: doc.id, ...doc.data() } as Ingredient);
      });
      setState(prev => ({ ...prev, ingredients: ingredientsData }));
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to recipes from Firebase
  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.RECIPES), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipesData: Recipe[] = [];
      snapshot.forEach((doc) => {
        recipesData.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      setState(prev => ({ ...prev, recipes: recipesData }));
    });

    return () => unsubscribe();
  }, []);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
    try {
      const validatedData = validateProduct(productData);
      await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
        ...validatedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }, []);

  const updateProduct = useCallback(async (id: string, productData: Omit<Product, 'id'>) => {
    try {
      const validatedData = validateProduct(productData);
      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      await updateDoc(productRef, {
        ...validatedData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }, []);

  const addCategory = useCallback(async (id: string, data: CategoryData) => {
    try {
      const order = state.categoryOrder.length;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
        name: String(data.name || ''),
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }, [state.categoryOrder]);

  const updateCategory = useCallback(async (category: ProductCategory, data: CategoryData) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.CATEGORIES, category), {
        name: String(data.name || ''),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }, []);

  const deleteCategory = useCallback(async (category: ProductCategory) => {
    try {
      const batch = writeBatch(db);
      
      // Delete the category
      batch.delete(doc(db, COLLECTIONS.CATEGORIES, category));
      
      // Delete all products in the category
      const productsQuery = query(
        collection(db, COLLECTIONS.PRODUCTS), 
        where('category', '==', category)
      );
      const productsSnapshot = await getDocs(productsQuery);
      productsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }, []);

  const reorderCategories = useCallback(async (newOrder: ProductCategory[]) => {
    try {
      const batch = writeBatch(db);
      
      newOrder.forEach((categoryId, index) => {
        const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
        batch.update(categoryRef, { 
          order: index,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  }, []);

  const reorderProducts = useCallback(async (categoryId: string, newOrder: string[]) => {
    try {
      const batch = writeBatch(db);
      
      newOrder.forEach((productId, index) => {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        batch.update(productRef, { 
          order: index,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error reordering products:', error);
      throw error;
    }
  }, []);

  const addIngredient = useCallback(async (ingredientData: Omit<Ingredient, 'id'>) => {
    try {
      await addDoc(collection(db, COLLECTIONS.INGREDIENTS), {
        ...ingredientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding ingredient:', error);
      throw error;
    }
  }, []);

  const updateIngredient = useCallback(async (id: string, ingredientData: Omit<Ingredient, 'id'>) => {
    try {
      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, id);
      await updateDoc(ingredientRef, {
        ...ingredientData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }, []);

  const deleteIngredient = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.INGREDIENTS, id));
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }, []);

  const addRecipe = useCallback(async (recipeData: Omit<Recipe, 'id'>) => {
    try {
      await addDoc(collection(db, COLLECTIONS.RECIPES), {
        ...recipeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw error;
    }
  }, []);

  const updateRecipe = useCallback(async (id: string, recipeData: Omit<Recipe, 'id'>) => {
    try {
      const recipeRef = doc(db, COLLECTIONS.RECIPES, id);
      await updateDoc(recipeRef, {
        ...recipeData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.RECIPES, id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }, []);

  const getProductsByCategory = useCallback((category: string) => {
    return state.products.filter(p => p.category === category);
  }, [state.products]);

  const value = {
    ...state,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    reorderProducts,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    updateStockLevel,
    getStockHistory,
    getProductsByCategory
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}