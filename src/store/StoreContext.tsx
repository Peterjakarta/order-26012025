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
import { db, COLLECTIONS, getBatch, commitBatchIfNeeded, getNetworkStatus } from '../lib/firebase';
import { categories as initialCategories } from '../data/categories';
import type { Product, ProductCategory, CategoryData, Ingredient, Recipe, StockLevel, StockHistory, StockCategory } from '../types/types';
import { auth } from '../lib/firebase';
import {
  logProductCreate,
  logProductUpdate,
  logProductDelete,
  logRecipeCreate,
  logRecipeUpdate,
  logRecipeDelete,
  logIngredientCreate,
  logIngredientUpdate,
  logIngredientDelete,
  logStockUpdate,
  logCategoryCreate,
  logCategoryUpdate,
  logCategoryDelete
} from '../utils/logger';

async function ensureAllCategoriesExist() {
  try {
    // Get existing categories from Firestore
    const categoriesSnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
    const existingCategories = new Set(categoriesSnapshot.docs.map(doc => doc.id));
    
    // Find missing categories
    const missingCategories = Object.entries(initialCategories).filter(
      ([categoryId]) => !existingCategories.has(categoryId)
    );
    
    if (missingCategories.length > 0) {
      console.log('Missing categories found, adding to Firestore:', missingCategories.map(([id]) => id));
      
      const batch = writeBatch(db);
      const currentMaxOrder = categoriesSnapshot.size;
      
      missingCategories.forEach(([categoryId, categoryData], index) => {
        const categoryRef = doc(db, COLLECTIONS.CATEGORIES, categoryId);
        batch.set(categoryRef, {
          name: categoryData.name,
          order: currentMaxOrder + index,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('Successfully added missing categories to Firestore');
    }
  } catch (error) {
    console.error('Error ensuring categories exist:', error);
  }
}

interface StoreState {
  products: Product[];
  categories: Record<ProductCategory, CategoryData>;
  categoryOrder: ProductCategory[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  stockLevels: Record<string, StockLevel>;
  stockCategories: StockCategory[];
  stockHistory: StockHistory[];
}

interface StoreContextType extends StoreState {
  addProduct: (product: Omit<Product, 'id'>) => Promise<string>;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateCategory: (category: ProductCategory, data: CategoryData) => Promise<void>;
  addCategory: (id: string, data: CategoryData) => Promise<void>;
  deleteCategory: (category: ProductCategory) => Promise<void>;
  reorderCategories: (newOrder: ProductCategory[]) => Promise<void>;
  reorderProducts: (categoryId: string, newOrder: string[]) => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => Promise<string>;
  updateIngredient: (id: string, ingredient: Omit<Ingredient, 'id'>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  updateIngredientCategories: (categoryId: string, ingredientIds: string[]) => Promise<void>;
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
  addStockCategory: (data: { name: string; description?: string }) => Promise<void>;
  updateStockCategory: (id: string, data: { name: string; description?: string }) => Promise<void>;
  deleteStockCategory: (id: string) => Promise<void>;
  refreshStockHistory: () => Promise<void>;
  findOrCreateRecipeForRDProduct: (rdProductId: string, recipeData: Partial<Omit<Recipe, 'id'>>) => Promise<string | null>;
}

const StoreContext = createContext<StoreContextType | null>(null);

function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj;
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const cleanedNested = removeUndefinedFields(value);
          if (cleanedNested !== undefined && Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return obj;
}

function validateProduct(data: any): Omit<Product, 'id'> {
  const product: any = {
    name: String(data.name || ''),
    category: String(data.category || ''),
    description: String(data.description || ''),
    unit: String(data.unit || ''),
    minOrder: Number(data.minOrder) || 0,
    price: Number(data.price) || 0,
    quantityStep: data.quantityStep ? Number(data.quantityStep) : null,
    showPrice: Boolean(data.showPrice),
    showDescription: Boolean(data.showDescription),
    showUnit: Boolean(data.showUnit),
    showMinOrder: Boolean(data.showMinOrder)
  };

  if (data.haccp) {
    const cleanedHaccp = removeUndefinedFields(data.haccp);
    if (cleanedHaccp && Object.keys(cleanedHaccp).length > 0) {
      product.haccp = cleanedHaccp;
    }
  }

  return product;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>(() => ({
    categories: initialCategories,
    categoryOrder: Object.keys(initialCategories),
    products: [],
    ingredients: [],
    recipes: [],
    stockLevels: {} as Record<string, StockLevel>,
    stockCategories: [],
    stockHistory: []
  }));

  const refreshStockHistory = useCallback(async () => {
    try {
      console.log('Manually refreshing stock history...');
      const q = query(
        collection(db, COLLECTIONS.STOCK_HISTORY),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      
      const snapshot = await getDocs(q);
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
      console.log(`Refreshed stock history: ${historyData.length} entries`);
      return historyData;
    } catch (error) {
      console.error('Error refreshing stock history:', error);
      return state.stockHistory;
    }
  }, [state.stockHistory]);

  const updateStockLevel = useCallback(async (ingredientId: string, data: {
    quantity: number;
    minStock?: number;
    orderId?: string;
    changeType?: 'reduction' | 'reversion' | 'manual';
  }) => {
    try {
      if (!getNetworkStatus()) {
        throw new Error('Cannot update stock while offline');
      }

      const ingredientRef = doc(db, COLLECTIONS.INGREDIENTS, ingredientId);
      const ingredientDoc = await getDoc(ingredientRef);
      if (!ingredientDoc.exists()) {
        throw new Error('Ingredient not found');
      }

      const stockRef = doc(db, COLLECTIONS.STOCK, ingredientId);
      const stockDoc = await getDoc(stockRef);
      const currentStock = stockDoc.exists() ? stockDoc.data().quantity || 0 : 0;
      
      const newQuantity = Math.ceil(Math.max(0, Number(data.quantity)));
      const minStock = data.minStock === undefined ? undefined : Math.ceil(Math.max(0, Number(data.minStock)));
      
      const changeAmount = newQuantity - currentStock;
      if (Math.abs(changeAmount) > 9999999) {
        throw new Error('Stock change amount exceeds system limits (max 9,999,999)');
      }

      const batch = writeBatch(db);
      
      batch.set(stockRef, {
        quantity: newQuantity,
        ...(minStock !== undefined && { minStock }),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      const historyRef = doc(collection(db, COLLECTIONS.STOCK_HISTORY));
      const historyData = {
        ingredientId,
        previousQuantity: currentStock,
        newQuantity,
        changeAmount,
        changeType: data.changeType || 'manual',
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid || 'system',
        ...(data.orderId && { orderId: data.orderId })
      };

      batch.set(historyRef, historyData);

      await batch.commit();

      const ingredient = state.ingredients.find(i => i.id === ingredientId);
      if (ingredient) {
        await logStockUpdate(ingredient.name, ingredientId, currentStock, newQuantity);
      }

      if (data.changeType === 'reduction' || data.changeType === 'reversion') {
        await refreshStockHistory();
      }

      return true;
    } catch (error) {
      console.error('Error updating stock level:', {
        ingredientId,
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [refreshStockHistory, state.ingredients]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
    try {
      console.log('Adding product to Firestore:', productData);
      const validatedData = validateProduct(productData);
      const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
        ...validatedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Product added with ID:', docRef.id);

      await logProductCreate(
        validatedData.name,
        docRef.id,
        state.categories[validatedData.category]?.name
      );

      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }, [state.categories]);

  const updateProduct = useCallback(async (id: string, productData: Omit<Product, 'id'>) => {
    try {
      console.log('updateProduct called with:', { id, productData });
      const validatedData = validateProduct(productData);
      console.log('After validation:', validatedData);

      const productRef = doc(db, COLLECTIONS.PRODUCTS, id);
      const dataToUpdate = {
        ...validatedData,
        updatedAt: serverTimestamp()
      };

      console.log('Updating Firestore with:', dataToUpdate);
      await updateDoc(productRef, dataToUpdate);
      console.log('Successfully updated product in Firestore');

      await logProductUpdate(validatedData.name, id);
    } catch (error) {
      console.error('Error updating product in StoreContext:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      const product = state.products.find(p => p.id === id);
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));

      if (product) {
        await logProductDelete(product.name, id);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }, [state.products]);

  const addCategory = useCallback(async (id: string, data: CategoryData) => {
    try {
      const order = state.categoryOrder.length;
      await setDoc(doc(db, COLLECTIONS.CATEGORIES, id), {
        name: String(data.name || ''),
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logCategoryCreate(data.name, id);
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

      await logCategoryUpdate(data.name, category);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }, []);

  const deleteCategory = useCallback(async (category: ProductCategory) => {
    try {
      const categoryName = state.categories[category]?.name || category;
      const batch = writeBatch(db);

      batch.delete(doc(db, COLLECTIONS.CATEGORIES, category));

      const productsQuery = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('category', '==', category)
      );
      const productsSnapshot = await getDocs(productsQuery);
      productsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      await logCategoryDelete(categoryName, category);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }, [state.categories]);

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

  const addIngredient = useCallback(async (ingredientData: Omit<Ingredient, 'id'>): Promise<string> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.INGREDIENTS),
        where('name', '==', ingredientData.name)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.INGREDIENTS), {
        ...ingredientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logIngredientCreate(ingredientData.name, docRef.id);

      return docRef.id;
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

      await logIngredientUpdate(ingredientData.name, id);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }, []);

  const deleteIngredient = useCallback(async (id: string) => {
    try {
      const ingredient = state.ingredients.find(i => i.id === id);
      await deleteDoc(doc(db, COLLECTIONS.INGREDIENTS, id));

      if (ingredient) {
        await logIngredientDelete(ingredient.name, id);
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }, [state.ingredients]);

  const updateIngredientCategories = useCallback(async (categoryId: string, ingredientIds: string[]) => {
    try {
      const batch = writeBatch(db);
      
      const q = query(
        collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS),
        where('category_id', '==', categoryId)
      );
      
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      for (const ingredientId of ingredientIds) {
        const docRef = doc(collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS));
        batch.set(docRef, {
          category_id: categoryId,
          ingredient_id: ingredientId,
          created_at: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating ingredient categories:', error);
      throw error;
    }
  }, []);

  const getStockHistory = useCallback(async (ingredientId?: string) => {
    try {
      if (!getNetworkStatus()) {
        let filteredHistory = state.stockHistory;
        if (ingredientId) {
          filteredHistory = state.stockHistory.filter(h => h.ingredientId === ingredientId);
        }
        return filteredHistory;
      }

      if (ingredientId) {
        try {
          const simpleQuery = query(
            collection(db, COLLECTIONS.STOCK_HISTORY),
            where('ingredientId', '==', ingredientId)
          );
          
          const snapshot = await getDocs(simpleQuery);
          const historyEntries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
          })) as StockHistory[];
          
          return historyEntries.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        } catch (queryError) {
          console.error('Error executing stock history query:', queryError);
          return state.stockHistory.filter(h => h.ingredientId === ingredientId);
        }
      }
      
      try {
        const simpleQuery = query(
          collection(db, COLLECTIONS.STOCK_HISTORY),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        
        const snapshot = await getDocs(simpleQuery);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        })) as StockHistory[];
      } catch (queryError) {
        console.error('Error executing stock history query:', queryError);
        return state.stockHistory;
      }
    } catch (error) {
      console.error('Error getting stock history:', error);
      if (ingredientId) {
        return state.stockHistory.filter(h => h.ingredientId === ingredientId);
      }
      return state.stockHistory;
    }
  }, [state.stockHistory]);

  const addRecipe = useCallback(async (recipeData: Omit<Recipe, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.RECIPES), {
        ...recipeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logRecipeCreate(recipeData.name, docRef.id);
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

      await logRecipeUpdate(recipeData.name, id);
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      const recipe = state.recipes.find(r => r.id === id);
      await deleteDoc(doc(db, COLLECTIONS.RECIPES, id));

      if (recipe) {
        await logRecipeDelete(recipe.name, id);
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }, [state.recipes]);

  // New function to find or create a recipe for an RD product
  const findOrCreateRecipeForRDProduct = useCallback(async (
    rdProductId: string, 
    recipeData: Partial<Omit<Recipe, 'id'>>
  ): Promise<string | null> => {
    try {
      // First try to find an existing recipe by looking for the Development ID in notes
      const recipesRef = collection(db, COLLECTIONS.RECIPES);
      const snapshot = await getDocs(recipesRef);
      
      let existingRecipe = null;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.notes && typeof data.notes === 'string' && data.notes.includes(`Development ID: ${rdProductId}`)) {
          existingRecipe = { id: doc.id, ...data };
        }
      });
      
      // If found, update the existing recipe
      if (existingRecipe) {
        await updateDoc(doc(db, COLLECTIONS.RECIPES, existingRecipe.id), {
          ...recipeData,
          updatedAt: serverTimestamp()
        });
        return existingRecipe.id;
      }
      
      // Otherwise create a new recipe
      if (!recipeData.name || !recipeData.category || !recipeData.ingredients || recipeData.ingredients.length === 0) {
        console.error('Missing required recipe data');
        return null;
      }
      
      // Create a complete recipe object
      const completeRecipeData: Omit<Recipe, 'id'> = {
        name: recipeData.name,
        description: recipeData.description || '',
        category: recipeData.category,
        productId: recipeData.productId || '',
        yield: recipeData.yield || 1,
        yieldUnit: recipeData.yieldUnit || 'pcs',
        ingredients: recipeData.ingredients,
        notes: [
          recipeData.notes || '',
          '--- Created from R&D Product ---',
          `Development ID: ${rdProductId}`
        ].filter(Boolean).join('\n')
      };
      
      // Add the recipe
      const docRef = await addDoc(collection(db, COLLECTIONS.RECIPES), {
        ...completeRecipeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error finding or creating recipe:', error);
      return null;
    }
  }, []);

  const getProductsByCategory = useCallback((category: string) => {
    return state.products.filter(p => p.category === category);
  }, [state.products]);

  const addStockCategory = useCallback(async (data: { name: string; description?: string }) => {
    try {
      await addDoc(collection(db, COLLECTIONS.STOCK_CATEGORIES), {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding stock category:', error);
      throw error;
    }
  }, []);

  const updateStockCategory = useCallback(async (id: string, data: { name: string; description?: string }) => {
    try {
      const categoryRef = doc(db, COLLECTIONS.STOCK_CATEGORIES, id);
      await updateDoc(categoryRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating stock category:', error);
      throw error;
    }
  }, []);

  const deleteStockCategory = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.STOCK_CATEGORIES, id));
    } catch (error) {
      console.error('Error deleting stock category:', error);
      throw error;
    }
  }, []);

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

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.STOCK_CATEGORIES), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData: StockCategory[] = [];
      snapshot.forEach((doc) => {
        categoriesData.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
        } as StockCategory);
      });
      setState(prev => ({ ...prev, stockCategories: categoriesData }));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Ensure all categories from local data exist in Firestore before setting up listener
    ensureAllCategoriesExist().then(() => {
      console.log('Category synchronization complete, setting up real-time listener');
    });
    
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
    updateIngredientCategories,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    updateStockLevel,
    getStockHistory,
    getProductsByCategory,
    addStockCategory,
    updateStockCategory,
    deleteStockCategory,
    refreshStockHistory,
    findOrCreateRecipeForRDProduct
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