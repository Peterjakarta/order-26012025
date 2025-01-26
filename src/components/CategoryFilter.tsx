import React from 'react';
import { categories } from '../data/categories';
import type { ProductCategory } from '../types/types';

interface CategoryFilterProps {
  selectedCategory: ProductCategory | 'all';
  onChange: (category: ProductCategory | 'all') => void;
}

export default function CategoryFilter({ selectedCategory, onChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="category" className="text-sm font-medium text-gray-700">
        Filter by Category:
      </label>
      <select
        id="category"
        value={selectedCategory}
        onChange={(e) => onChange(e.target.value as ProductCategory | 'all')}
        className="p-2 border rounded-md bg-white shadow-sm focus:ring-pink-500 focus:border-pink-500"
      >
        <option value="all">All Categories</option>
        {Object.entries(categories).map(([key, { name }]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}