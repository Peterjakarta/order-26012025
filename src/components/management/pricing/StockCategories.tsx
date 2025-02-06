import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Package2 } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { StockCategory } from '../../../types/types';
import CategoryIngredients from './CategoryIngredients';

interface CategoryFormData {
  name: string;
  description?: string;
}

interface CategoryFormProps {
  initialData?: CategoryFormData;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}

function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({ name: name.trim(), description: description.trim() });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Category Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="e.g. Raw Materials"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
          placeholder="Add a description for this category..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Category'}
        </button>
      </div>
    </form>
  );
}

export default function StockCategories() {
  const { stockCategories, addStockCategory, updateStockCategory, deleteStockCategory } = useStore();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<StockCategory | null>(null);

  const handleAddCategory = async (data: CategoryFormData) => {
    try {
      await addStockCategory(data);
      setIsAddingCategory(false);
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateCategory = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    try {
      await updateStockCategory(editingCategory.id, data);
      setEditingCategory(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteCategory = async (category: StockCategory) => {
    try {
      setError(null);
      await deleteStockCategory(category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Stock Categories</h3>
        <button
          onClick={() => setIsAddingCategory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}

      {isAddingCategory && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <CategoryForm
            onSubmit={handleAddCategory}
            onCancel={() => setIsAddingCategory(false)}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stockCategories.map(category => (
          <div
            key={category.id}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            {editingCategory?.id === category.id ? (
              <CategoryForm
                initialData={category}
                onSubmit={handleUpdateCategory}
                onCancel={() => setEditingCategory(null)}
              />
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{category.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Edit category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedCategory(category)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      title="Manage ingredients"
                    >
                      <Package2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600">{category.description}</p>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  Created: {new Date(category.created_at).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      {selectedCategory && (
        <CategoryIngredients
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}