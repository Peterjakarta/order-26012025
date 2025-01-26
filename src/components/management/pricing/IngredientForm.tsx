import React, { useState, useRef, useEffect } from 'react';
import type { Ingredient } from '../../../types/types';
import { formatIDR } from '../../../utils/currencyFormatter';

interface IngredientFormProps {
  ingredient?: Ingredient | null;
  onSubmit: (data: Omit<Ingredient, 'id'>) => void;
  onCancel: () => void;
}

export default function IngredientForm({ ingredient, onSubmit, onCancel }: IngredientFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(ingredient?.name || '');
  const [unit, setUnit] = useState(ingredient?.unit || '');
  const [packageSize, setPackageSize] = useState(ingredient?.packageSize?.toString() || '');
  const [packageUnit, setPackageUnit] = useState(ingredient?.packageUnit || '');
  const [price, setPrice] = useState(ingredient?.price?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  // Scroll form into view when it mounts
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!name.trim()) {
      setError('Ingredient name is required');
      return;
    }
    if (!unit.trim()) {
      setError('Usage unit is required');
      return;
    }
    if (!packageUnit.trim()) {
      setError('Package unit is required');
      return;
    }

    // Parse numeric values
    const parsedPackageSize = parseFloat(packageSize);
    if (isNaN(parsedPackageSize) || parsedPackageSize <= 0) {
      setError('Package size must be a positive number');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Price must be a non-negative number');
      return;
    }

    onSubmit({
      name: name.trim(),
      unit: unit.trim(),
      packageSize: parsedPackageSize,
      packageUnit: packageUnit.trim(),
      price: parsedPrice
    });
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="bg-white p-6 rounded-lg shadow-sm space-y-4"
    >
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Ingredient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="e.g. Dark Chocolate 70%"
          />
        </div>

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Usage Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="e.g. grams"
          />
          <p className="mt-1 text-sm text-gray-500">
            Unit used in recipes
          </p>
        </div>

        <div>
          <label htmlFor="packageSize" className="block text-sm font-medium text-gray-700">
            Package Size <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="packageSize"
            value={packageSize}
            onChange={(e) => setPackageSize(e.target.value)}
            required
            min="0.01"
            step="0.01"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="e.g. 1000"
          />
          <p className="mt-1 text-sm text-gray-500">
            Size of each package purchased
          </p>
        </div>

        <div>
          <label htmlFor="packageUnit" className="block text-sm font-medium text-gray-700">
            Package Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="packageUnit"
            value={packageUnit}
            onChange={(e) => setPackageUnit(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="e.g. kg"
          />
          <p className="mt-1 text-sm text-gray-500">
            Unit of the package size
          </p>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price (IDR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="0"
            step="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="Enter price in IDR"
          />
          {ingredient?.price && (
            <p className="mt-1 text-sm text-gray-500">
              Current price: {formatIDR(ingredient.price)}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          {ingredient ? 'Update' : 'Add'} Ingredient
        </button>
      </div>
    </form>
  );
}