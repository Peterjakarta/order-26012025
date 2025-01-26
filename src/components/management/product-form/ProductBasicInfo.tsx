import React from 'react';
import type { Product } from '../../../types/types';

interface ProductBasicInfoProps {
  product?: Product | null;
}

export default function ProductBasicInfo({ product }: ProductBasicInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Product Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={product?.name}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="showDescription"
              defaultChecked={product?.showDescription}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Show description
          </label>
        </div>
        <textarea
          id="description"
          name="description"
          defaultValue={product?.description}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
          rows={3}
        />
      </div>
    </div>
  );
}