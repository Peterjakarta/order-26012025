import React from 'react';
import type { Product, ProductCategory } from '../../../types/types';

interface ProductCategoryProps {
  product?: Product | null;
  initialCategory?: string;
  categories: Record<ProductCategory, { name: string; description: string }>;
}

export default function ProductCategory({ 
  product, 
  initialCategory,
  categories 
}: ProductCategoryProps) {
  const defaultValue = product?.category || initialCategory || '';

  return (
    <div>
      <label htmlFor="category" className="block text-sm font-medium text-gray-700">
        Category <span className="text-red-500">*</span>
      </label>
      <select
        id="category"
        name="category"
        defaultValue={defaultValue}
        required
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
      >
        <option value="" disabled>Select a category</option>
        {Object.entries(categories).map(([key, { name }]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-sm text-gray-500">
        Required - Select the category this product belongs to
      </p>
    </div>
  );
}