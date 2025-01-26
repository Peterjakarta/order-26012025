import React, { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import ProductForm from './ProductForm';
import type { Product } from '../../types/types';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleSubmit = async (data: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
      } else {
        await addProduct(data);
      }
      setIsAddingProduct(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-6 h-6" />
          Products
        </h2>
        <button
          onClick={() => setIsAddingProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {(isAddingProduct || editingProduct) && (
        <ProductForm
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsAddingProduct(false);
            setEditingProduct(null);
          }}
        />
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {products.map(product => (
          <div key={product.id} className="p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{product.name}</h3>
              {product.showDescription && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}
              {product.showPrice && (
                <p className="text-sm">
                  ${product.price?.toFixed(2)}
                  {product.showUnit && product.unit && ` per ${product.unit}`}
                </p>
              )}
              {product.showMinOrder && (
                <p className="text-sm text-gray-500">
                  Min order: {product.minOrder}
                  {product.showUnit && product.unit && ` ${product.unit}`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingProduct(product)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => deleteProduct(product.id)}
                className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}