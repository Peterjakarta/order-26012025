import React from 'react';
import type { ProductCategory, CategoryData } from '../../types/types';

interface CategoryFormProps {
  category: ProductCategory;
  categoryData: CategoryData;
  onSubmit: (data: CategoryData) => void;
  onCancel: () => void;
}

export default function CategoryForm({ category, categoryData, onSubmit, onCancel }: CategoryFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit({
      name: formData.get('name') as string
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={categoryData.name}
          required
          className="mt-2 block w-full rounded-lg border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 transition-shadow duration-300"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-white rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors duration-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200 transform transition-all duration-300 hover:scale-[1.02]"
        >
          Update Category
        </button>
      </div>
    </form>
  );
}