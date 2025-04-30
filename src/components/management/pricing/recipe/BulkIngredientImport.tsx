import React, { useState } from 'react';
import { X, Search, Check, Plus, Loader2 } from 'lucide-react';
import { useStore } from '../../../../store/StoreContext';
import type { Ingredient, RecipeIngredient } from '../../../../types/types';
import { formatIDR } from '../../../../utils/currencyFormatter';

interface BulkIngredientImportProps {
  onImport: (ingredients: RecipeIngredient[]) => void;
  onClose: () => void;
  existingIngredientIds?: Set<string>;
}

export default function BulkIngredientImport({ 
  onImport, 
  onClose,
  existingIngredientIds = new Set()
}: BulkIngredientImportProps) {
  const { ingredients, stockCategories, stockLevels } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [ingredientAmounts, setIngredientAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Filter ingredients based on search term
  const filteredIngredients = ingredients
    .filter(ingredient => {
      // Filter by search term
      const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by selected category (if not 'all')
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        // For this demo, we'll just check if ingredient name contains the category name
        // In a real app, you'd use the actual category-ingredient relationships
        matchesCategory = ingredient.name.toLowerCase().includes(selectedCategory.toLowerCase());
      }

      // Filter out already selected ingredients
      const isNotSelected = !existingIngredientIds.has(ingredient.id);
      
      return matchesSearch && matchesCategory && isNotSelected;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelectIngredient = (ingredient: Ingredient) => {
    const isSelected = !!selectedIngredients[ingredient.id];
    
    if (isSelected) {
      // Deselect ingredient
      setSelectedIngredients(prev => {
        const next = { ...prev };
        delete next[ingredient.id];
        return next;
      });
      
      setIngredientAmounts(prev => {
        const next = { ...prev };
        delete next[ingredient.id];
        return next;
      });
    } else {
      // Select ingredient with default amount of 1
      setSelectedIngredients(prev => ({
        ...prev,
        [ingredient.id]: 1
      }));
      
      setIngredientAmounts(prev => ({
        ...prev,
        [ingredient.id]: '1'
      }));
    }
  };

  const handleAmountChange = (ingredientId: string, amount: string) => {
    // Update the amount in the state
    setIngredientAmounts(prev => ({
      ...prev,
      [ingredientId]: amount
    }));
    
    // Try to parse the amount and update the selectedIngredients if valid
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      setSelectedIngredients(prev => ({
        ...prev,
        [ingredientId]: numAmount
      }));
    }
  };

  const handleImport = () => {
    setError(null);
    
    try {
      // Validate amounts
      const invalidIngredients = Object.entries(selectedIngredients)
        .filter(([_, amount]) => isNaN(amount) || amount <= 0)
        .map(([id, _]) => ingredients.find(i => i.id === id)?.name || id);
      
      if (invalidIngredients.length > 0) {
        setError(`Invalid amounts for: ${invalidIngredients.join(', ')}`);
        return;
      }
      
      if (Object.keys(selectedIngredients).length === 0) {
        setError('Please select at least one ingredient');
        return;
      }
      
      // Create recipe ingredients from selected ingredients
      const recipeIngredients: RecipeIngredient[] = Object.entries(selectedIngredients).map(([id, amount]) => ({
        ingredientId: id,
        amount: amount
      }));
      
      onImport(recipeIngredients);
      onClose();
    } catch (err) {
      setError('Failed to import ingredients. Please check your inputs and try again.');
      console.error('Error importing ingredients:', err);
    }
  };

  const totalSelected = Object.keys(selectedIngredients).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Import Ingredients</h3>
          <p className="text-sm text-gray-600">
            Select ingredients to add to your recipe
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        {/* Search & Category Filters */}
        <div className="w-1/2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Filter
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="all">All Categories</option>
              {stockCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Selected Count & Action Buttons */}
        <div className="w-1/2 flex flex-col justify-between">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-2">Selection Summary</h4>
            <p className="text-sm">
              <span className="font-medium">{totalSelected}</span> ingredient{totalSelected !== 1 ? 's' : ''} selected
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={totalSelected === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? 'Importing...' : `Add Selected (${totalSelected})`}
            </button>
          </div>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-3 border-b">
          <div className="grid grid-cols-12 text-sm font-medium text-gray-500">
            <div className="col-span-1"></div>
            <div className="col-span-4">Ingredient</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-3">Price</div>
            <div className="col-span-2 text-center">Amount</div>
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto divide-y">
          {filteredIngredients.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No ingredients found matching your search
            </div>
          ) : (
            filteredIngredients.map(ingredient => {
              const isSelected = !!selectedIngredients[ingredient.id];
              const stockData = stockLevels[ingredient.id] || {};
              const currentStock = stockData.quantity || 0;
              const unitPrice = ingredient.price / ingredient.packageSize;
              
              return (
                <div 
                  key={ingredient.id} 
                  className={`p-3 grid grid-cols-12 items-center hover:bg-gray-50 ${isSelected ? 'bg-pink-50' : ''}`}
                >
                  {/* Selection Checkbox */}
                  <div className="col-span-1">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectIngredient(ingredient)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                    </label>
                  </div>
                  
                  {/* Ingredient Info */}
                  <div className="col-span-4">
                    <div 
                      className={`font-medium ${isSelected ? 'text-pink-700' : ''}`}
                      onClick={() => handleSelectIngredient(ingredient)}
                    >
                      {ingredient.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Stock: {currentStock} {ingredient.unit}
                    </div>
                  </div>
                  
                  {/* Unit */}
                  <div className="col-span-2 text-sm">
                    {ingredient.unit}
                  </div>
                  
                  {/* Price */}
                  <div className="col-span-3 text-sm">
                    <div>{formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit}</div>
                    <div className="text-xs text-gray-500">
                      {formatIDR(unitPrice)}/{ingredient.unit}
                    </div>
                  </div>
                  
                  {/* Amount Input */}
                  <div className="col-span-2 flex justify-center">
                    <input
                      type="number"
                      value={ingredientAmounts[ingredient.id] || ''}
                      onChange={(e) => handleAmountChange(ingredient.id, e.target.value)}
                      min="0.01"
                      step="0.01"
                      className={`w-20 p-1 text-center border rounded ${
                        isSelected ? 'border-pink-300 bg-white' : 'border-gray-300 bg-gray-100'
                      }`}
                      placeholder="Amount"
                      disabled={!isSelected}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}