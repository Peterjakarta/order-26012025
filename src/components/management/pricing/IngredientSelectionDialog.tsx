import React, { useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';
import type { Ingredient } from '../../../types/types';

interface IngredientSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ingredient: Ingredient) => void;
  selectedAmount: number;
}

export default function IngredientSelectionDialog({ isOpen, onClose, onSelect, selectedAmount }: IngredientSelectionDialogProps) {
  const { ingredients } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Filter ingredients based on search term
  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Select Ingredient</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-lg"
              autoFocus
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Amount to add:</span> {selectedAmount} (you can change this after adding)
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
            {filteredIngredients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? `No ingredients found matching "${searchTerm}"` : 'No ingredients available'}
              </div>
            ) : (
              filteredIngredients.map(ingredient => (
                <div
                  key={ingredient.id}
                  onClick={() => setSelectedIngredient(ingredient)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedIngredient?.id === ingredient.id ? 'bg-pink-50 border-l-4 border-pink-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{ingredient.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Unit price: {formatIDR(ingredient.price / ingredient.packageSize)} per {ingredient.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Amount: {selectedAmount}</p>
                      <p className="text-xs text-gray-500">{ingredient.unit}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedIngredient) {
                onSelect(selectedIngredient);
                onClose();
              }
            }}
            disabled={!selectedIngredient}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Add Ingredient
          </button>
        </div>
      </div>
    </div>
  );
}