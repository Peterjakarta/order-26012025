import { useState, useCallback, useEffect } from 'react';
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

// ... rest of the file remains unchanged ...

// Initialize stock levels in Firestore if they don't exist
const initializeStockLevels = async (ingredients: Ingredient[]) => {
  try {
    const batch = writeBatch(db);
    let operationsCount = 0;

    for (const ingredient of ingredients) {
      const stockRef = doc(db, COLLECTIONS.STOCK, ingredient.id);
      const stockDoc = await getDoc(stockRef);

      if (!stockDoc.exists()) {
        batch.set(stockRef, {
          quantity: 0,
          updatedAt: serverTimestamp()
        });
        operationsCount++;

        if (operationsCount >= 500) {
          await batch.commit();
          operationsCount = 0;
        }
      }
    }

    if (operationsCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error initializing stock levels:', error);
  }
};

// Add this to your useEffect hooks section
useEffect(() => {
  // Initialize stock levels when ingredients are loaded
  if (ingredients.length > 0) {
    initializeStockLevels(ingredients);
  }
}, [ingredients]);

// ... rest of the file remains unchanged ...