import React from 'react';
import type { Product } from '../../../types/types';
import QuantitySelector from '../../product/QuantitySelector';

interface ProductPricingProps {
  product?: Product | null;
}

export default function ProductPricing({ product }: ProductPricingProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Unit
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="showUnit"
              defaultChecked={product?.showUnit}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Show unit
          </label>
        </div>
        <input
          type="text"
          id="unit"
          name="unit"
          defaultValue={product?.unit}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="quantityStep" className="block text-sm font-medium text-gray-700">
            Quantity Step
          </label>
          <div className="text-sm text-gray-500">
            Optional - Leave empty for category default
          </div>
        </div>
        <input
          type="number"
          id="quantityStep"
          name="quantityStep"
          defaultValue={product?.quantityStep}
          min="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
          placeholder="e.g. 5"
        />
        <p className="mt-1 text-sm text-gray-500">
          Customers can only order in multiples of this number
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="minOrder" className="block text-sm font-medium text-gray-700">
            Minimum Order
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="showMinOrder"
              defaultChecked={product?.showMinOrder}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Show minimum order
          </label>
        </div>
        <div className="mt-1">
          {product?.category ? (
            <QuantitySelector
              product={product}
              quantity={product?.minOrder || 0}
              onQuantityChange={(_, quantity) => {
                const input = document.querySelector('input[name="minOrder"]') as HTMLInputElement;
                if (input) {
                  input.value = quantity.toString();
                }
              }}
            />
          ) : (
            <input
              type="number"
              id="minOrder"
              name="minOrder"
              defaultValue={product?.minOrder}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="showPrice"
              defaultChecked={product?.showPrice}
              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            Show price
          </label>
        </div>
        <input
          type="number"
          id="price"
          name="price"
          defaultValue={product?.price}
          step="0.01"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        />
      </div>
    </div>
  );
}