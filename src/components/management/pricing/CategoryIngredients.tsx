import React, { useState } from 'react';
import { Plus, X, Search, AlertCircle, Check } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { StockCategory } from '../../../types/types';

interface CategoryIngredientsProps {
  category: StockCategory;
  onClose: () => void;
}

export default function CategoryIngredients({ category, onClose }: CategoryIngredientsProps) {
  const { ingredients } = useStore();
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleIngredient = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleAddIngredients = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (selectedIngredients.size === 0) {
        setError('Please select at least one ingredient');
        return;
      }

      // Update ingredient categories
      await updateIngredientCategories(
        Array.from(selectedIngredients),
        category.id
      );
      
      setSuccess('Ingredients added successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredients');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-medium">{category.name}</h2>
            <p className="text-sm text-gray-600">Select ingredients for this category</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
              <p className="text-sm">{error}</p>
            </div>
          )}
      
          {success && (
            <div className="flex items-center gap-2 bg-green-50 text-green-600 p-4 rounded-md mb-4">
              <Check className="w-5 h-5" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="mb-4">
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
          </div>

          <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y">
            {filteredIngredients.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No ingredients found
              </div>
            ) : (
              filteredIngredients.map(ingredient => (
                <label
                  key={ingredient.id}
                  className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedIngredients.has(ingredient.id) ? 'bg-pink-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIngredients.has(ingredient.id)}
                    onChange={() => handleToggleIngredient(ingredient.id)}
                    className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <div>
                    <div className="font-medium">{ingredient.name}</div>
                    <div className="text-sm text-gray-600">
                      {ingredient.unit} • {ingredient.packageSize} {ingredient.packageUnit}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleAddIngredients}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Adding...' : `Add Selected (${selectedIngredients.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}