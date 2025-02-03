import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Upload, Copy, Check, Package2 } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Ingredient } from '../../../types/types';
import IngredientForm from './IngredientForm';
import BulkIngredientImport from './BulkIngredientImport';
import ProductToIngredient from './ProductToIngredient';
import { formatIDR } from '../../../utils/currencyFormatter';

export default function IngredientManagement() {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useStore();
  const [isAddingIngredient, setIsAddingIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showProductImport, setShowProductImport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
              <div className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{ingredient.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit}
                  </p>
                  <p className="text-sm text-gray-500">
                    Used in: {ingredient.unit}
                  </p>
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