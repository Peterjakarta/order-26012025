import React, { useState } from 'react';
import { Package2, AlertCircle } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Ingredient } from '../../../types/types';

interface ProductToIngredientProps {
  onImport: (ingredients: Omit<Ingredient, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

export default function ProductToIngredient({ onImport, onClose }: ProductToIngredientProps) {
  const { products } = useStore();
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedProducts.size === 0) {
      setError('Please select at least one product');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      // Convert selected products to ingredients
      const ingredients: Omit<Ingredient, 'id'>[] = products
        .filter(product => selectedProducts.has(product.id))
        .map(product => ({
          name: product.name,
          unit: product.unit || 'pcs',
          packageSize: 1,
          packageUnit: product.unit || 'pcs',
          price: product.price || 0
        }));

      await onImport(ingredients);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <Package2 className="w-5 h-5 text-gray-500" />
        <div>
          <h3 className="text-lg font-medium">Import from Products</h3>
          <p className="text-sm text-gray-500">
            Convert existing products into ingredients
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {products.map(product => (
          <label
            key={product.id}
            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-colors ${
              selectedProducts.has(product.id)
                ? 'bg-pink-50 border-pink-200'
                : 'hover:bg-gray-50 border-transparent'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedProducts.has(product.id)}
              onChange={() => handleToggleProduct(product.id)}
              className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <div>
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-600">
                Unit: {product.unit || 'pcs'}
                {product.price !== undefined && (
                  <> • Price: ${product.price.toFixed(2)}</>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={importing || selectedProducts.size === 0}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
        >
          {importing ? 'Importing...' : `Import Selected (${selectedProducts.size})`}
        </button>
      </div>
    </div>
  );
}