import { useCallback } from 'react';
import { useStore } from '../store/StoreContext';
import type { ProductCategory } from '../types/types';

export function useCategories() {
  const { 
    categories, 
    updateCategory, 
    addCategory, 
    deleteCategory 
  } = useStore();

  const handleDeleteCategory = useCallback((category: ProductCategory) => {
    if (window.confirm('Are you sure? This will also delete all products in this category.')) {
      deleteCategory(category);
    }
  }, [deleteCategory]);

  return { 
    categories, 
    updateCategory, 
    addCategory, 
    deleteCategory: handleDeleteCategory 
  };
}