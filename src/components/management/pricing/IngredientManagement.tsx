import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Copy, Check, Package2, FolderEdit } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Ingredient, StockCategory } from '../../../types/types';
import IngredientForm from './IngredientForm';
import BulkIngredientImport from './BulkIngredientImport';
import ProductToIngredient from './ProductToIngredient';
import { formatIDR } from '../../../utils/currencyFormatter';
import { collection, getDocs, query } from 'firebase/firestore';
import { COLLECTIONS } from '../../../lib/firebase';

export default function IngredientManagement() {
  const { ingredients, stockCategories, addIngredient, updateIngredient, deleteIngredient, updateIngredientCategories } = useStore();
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showProductImport, setShowProductImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [savingCategories, setSavingCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const handleCategoryChange = async (ingredientId: string, categoryIds: string[]) => {
    try {
      setSavingCategories(prev => new Set(prev).add(ingredientId));
      setError(null);

      // Update local state immediately
      setSelectedCategories(prev => ({
        ...prev,
        [ingredientId]: categoryIds
      }));

      // Save to database
      await updateIngredientCategories(ingredientId, categoryIds);
      
      // Close dropdown after successful save
      setEditingCategoryId(null);
    } catch (err) {
      setError('Failed to update categories. Please try again.');
      console.error('Error updating categories:', err);
    } finally {
      setSavingCategories(prev => {
        const next = new Set(prev);
        next.delete(ingredientId);
        return next;
      });
    }
  };

  // Load initial category selections
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const q = query(collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS));
        const snapshot = await getDocs(q);
        
        const categoryMap: Record<string, string[]> = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const ingredientId = data.ingredient_id;
          const categoryId = data.category_id;
          
          if (!categoryMap[ingredientId]) {
            categoryMap[ingredientId] = [];
          }
          categoryMap[ingredientId].push(categoryId);
        });
        
        setSelectedCategories(categoryMap);
      } catch (err) {
        console.error('Error loading ingredient categories:', err);
        setError('Failed to load ingredient categories');
      }
    };

    loadCategories();
  }, []);

  const handleSubmit = async (data: Omit<Ingredient, 'id'>) => {
    try {
      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, data);
        setEditingIngredient(null);
      } else {
        await addIngredient(data);
        setIsAddingIngredient(false);
      }
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Failed to save ingredient. Please try again.');
    }
  };

  const handleBulkImport = async (ingredients: Omit<Ingredient, 'id'>[]) => {
    try {
      for (const ingredient of ingredients) {
        await addIngredient(ingredient);
      }
    } catch (error) {
      console.error('Error importing ingredients:', error);
      throw error;
    }
  };

  const handleCopyIngredient = async (ingredient: Ingredient) => {
    try {
      const copyData: Omit<Ingredient, 'id'> = {
        name: `${ingredient.name} (Copy)`,
        unit: ingredient.unit,
        packageSize: ingredient.packageSize,
        packageUnit: ingredient.packageUnit,
        price: ingredient.price
      };

      await addIngredient(copyData);
      setCopiedId(ingredient.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying ingredient:', error);
      alert('Failed to copy ingredient. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ingredients</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProductImport(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <Package2 className="w-4 h-4" />
            Import from Products
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddingIngredient(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Ingredient
          </button>
        </div>
      </div>

      {showBulkImport && (
        <BulkIngredientImport
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {showProductImport && (
        <ProductToIngredient
          onImport={handleBulkImport}
          onClose={() => setShowProductImport(false)}
        />
      )}

      {isAddingIngredient && (
        <IngredientForm
          ingredient={null}
          onSubmit={handleSubmit}
          onCancel={() => setIsAddingIngredient(false)}
        />
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {ingredients.map(ingredient => (
          <div key={ingredient.id}>
            {editingIngredient?.id === ingredient.id ? ( 
              <div className="p-4">
                <IngredientForm
                  ingredient={ingredient}
                  onSubmit={handleSubmit}
                  onCancel={() => setEditingIngredient(null)}
                />
              </div>
            ) : (
              <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <h3 className="font-medium">{ingredient.name}</h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-600">
                      {formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit}
                    </p>
                    <p className="text-sm text-gray-500">
                      Used in: {ingredient.unit}
                    </p>
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Categories:</label>
                        {editingCategoryId === ingredient.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="text-sm border rounded-md px-2 py-1 pr-8 bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                              value={selectedCategories[ingredient.id] || []}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions).map(option => option.value);
                                handleCategoryChange(ingredient.id, selected);
                              }}
                              multiple
                              size={4}
                              onClick={(e) => e.stopPropagation()}
                              disabled={savingCategories.has(ingredient.id)}
                            >
                              {stockCategories.map(category => (
                                <option 
                                  key={category.id} 
                                  value={category.id}
                                  className="py-1 px-2 hover:bg-gray-100"
                                >
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {savingCategories.has(ingredient.id) && (
                              <span className="text-xs text-gray-500">Saving...</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {selectedCategories[ingredient.id]?.length
                                ? stockCategories
                                    .filter(c => selectedCategories[ingredient.id]?.includes(c.id))
                                    .map(c => c.name)
                                    .join(', ')
                                : 'None'}
                            </span>
                            <button
                              onClick={() => setEditingCategoryId(ingredient.id)}
                              className="p-1 hover:bg-gray-100 rounded-full"
                            >
                              <FolderEdit className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyIngredient(ingredient)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                    title="Copy ingredient"
                  >
                    {copiedId === ingredient.id ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setEditingIngredient(ingredient)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteIngredient(ingredient.id)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}