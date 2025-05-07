import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Upload, Copy, Check, Package2, FolderEdit, FileSpreadsheet, Search, List, Grid, Save, X } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { Ingredient, StockCategory } from '../../../types/types';
import IngredientForm from './IngredientForm';
import BulkIngredientImport from './BulkIngredientImport';
import ProductToIngredient from './ProductToIngredient';
import { formatIDR } from '../../../utils/currencyFormatter';
import { collection, getDocs, query } from 'firebase/firestore';
import { COLLECTIONS } from '../../../lib/firebase';
import { generateIngredientsExcel, saveWorkbook } from '../../../utils/excelGenerator';

export default function IngredientManagement() {
  const { ingredients, stockCategories, addIngredient, updateIngredient, deleteIngredient, updateIngredientCategories, stockLevels } = useStore();
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showProductImport, setShowProductImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [savingCategories, setSavingCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Inline editing states
  const [inlineEditing, setInlineEditing] = useState<Record<string, boolean>>({});
  const [inlineValues, setInlineValues] = useState<Record<string, Partial<Ingredient>>>({});

  const loadCategories = useCallback(async () => {
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
  }, []);

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadCategories();
      }
    });
    
    return () => unsubscribe();
  }, [loadCategories]);

  // Initialize inline values from ingredients
  useEffect(() => {
    const values: Record<string, Partial<Ingredient>> = {};
    ingredients.forEach(ingredient => {
      values[ingredient.id] = { ...ingredient };
    });
    setInlineValues(values);
  }, [ingredients]);

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

  const handleExportToExcel = () => {
    try {
      const wb = generateIngredientsExcel(ingredients, stockLevels, stockCategories, selectedCategories);
      saveWorkbook(wb, 'ingredients-list.xlsx');
    } catch (error) {
      console.error('Error exporting ingredients:', error);
      alert('Failed to export ingredients. Please try again.');
    }
  };
  
  // Start inline editing for an ingredient
  const startInlineEdit = (ingredientId: string) => {
    setInlineEditing(prev => ({
      ...prev,
      [ingredientId]: true
    }));
    // Ensure we have current values to edit
    setInlineValues(prev => ({
      ...prev,
      [ingredientId]: {
        ...ingredients.find(i => i.id === ingredientId)!
      }
    }));
  };
  
  // Cancel inline editing
  const cancelInlineEdit = (ingredientId: string) => {
    setInlineEditing(prev => ({
      ...prev,
      [ingredientId]: false
    }));
    // Reset to original values
    setInlineValues(prev => ({
      ...prev,
      [ingredientId]: {
        ...ingredients.find(i => i.id === ingredientId)!
      }
    }));
  };
  
  // Save inline edits
  const saveInlineEdit = async (ingredientId: string) => {
    try {
      const updates = inlineValues[ingredientId];
      await updateIngredient(ingredientId, updates);
      setInlineEditing(prev => ({
        ...prev,
        [ingredientId]: false
      }));
    } catch (error) {
      console.error('Error updating ingredient:', error);
      alert('Failed to update ingredient. Please try again.');
    }
  };
  
  // Handle inline value changes
  const handleInlineChange = (ingredientId: string, field: keyof Ingredient, value: any) => {
    setInlineValues(prev => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        [field]: value
      }
    }));
  };
  
  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter(ingredient => 
    searchTerm === '' || 
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ingredient.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ingredient.packageUnit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ingredients</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
            title={viewMode === 'card' ? "Switch to list view" : "Switch to card view"}
          >
            {viewMode === 'card' ? (
              <>
                <List className="w-4 h-4" />
                List View
              </>
            ) : (
              <>
                <Grid className="w-4 h-4" />
                Card View
              </>
            )}
          </button>
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
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
      
      {/* Search Box */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search ingredients by name, unit, or package..."
          className="w-full pl-10 pr-4 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        />
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Clear search</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
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

      {viewMode === 'card' ? (
        // Card View
        <div className="bg-white shadow-sm rounded-lg divide-y">
          {filteredIngredients.length > 0 ? (
            filteredIngredients.map(ingredient => (
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
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? (
                <p>No ingredients match your search term "{searchTerm}"</p>
              ) : (
                <p>No ingredients found. Add your first ingredient to get started.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        // List View with inline editing
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Size</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Unit</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Categories</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.length > 0 ? (
                  filteredIngredients.map(ingredient => {
                    const isEditing = inlineEditing[ingredient.id] || false;
                    const inlineVals = inlineValues[ingredient.id] || ingredient;
                    const unitPrice = inlineVals.price / inlineVals.packageSize;
                    
                    return (
                      <tr key={ingredient.id} className={isEditing ? "bg-blue-50" : "hover:bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={inlineVals.name}
                              onChange={e => handleInlineChange(ingredient.id, 'name', e.target.value)}
                              className="w-full px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={inlineVals.unit}
                              onChange={e => handleInlineChange(ingredient.id, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{ingredient.unit}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={inlineVals.packageSize}
                              onChange={e => handleInlineChange(ingredient.id, 'packageSize', parseFloat(e.target.value))}
                              min="0.01"
                              step="0.01"
                              className="w-full px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{ingredient.packageSize}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={inlineVals.packageUnit}
                              onChange={e => handleInlineChange(ingredient.id, 'packageUnit', e.target.value)}
                              className="w-full px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">{ingredient.packageUnit}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {isEditing ? (
                            <input 
                              type="number" 
                              value={inlineVals.price}
                              onChange={e => handleInlineChange(ingredient.id, 'price', parseFloat(e.target.value))}
                              min="0"
                              step="1"
                              className="w-full px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right"
                            />
                          ) : (
                            formatIDR(ingredient.price)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                          {formatIDR(unitPrice)} / {ingredient.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="text-xs text-gray-600">
                            {selectedCategories[ingredient.id]?.length
                              ? stockCategories
                                  .filter(c => selectedCategories[ingredient.id]?.includes(c.id))
                                  .map(c => c.name)
                                  .join(', ')
                              : 'None'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveInlineEdit(ingredient.id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                                  title="Save changes"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => cancelInlineEdit(ingredient.id)}
                                  className="p-1 text-gray-400 hover:bg-gray-50 rounded-full"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startInlineEdit(ingredient.id)}
                                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                  title="Edit ingredient"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleCopyIngredient(ingredient)}
                                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                  title="Copy ingredient"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteIngredient(ingredient.id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                  title="Delete ingredient"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? (
                        <p>No ingredients match your search term "{searchTerm}"</p>
                      ) : (
                        <p>No ingredients found. Add your first ingredient to get started.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}