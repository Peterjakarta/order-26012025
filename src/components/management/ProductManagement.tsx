import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';
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
        <h2 className="text-xl font-semibold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          <Package className="w-6 h-6" />
          Products
        </h2>
        <button
          onClick={() => setIsAddingProduct(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200 transform transition-all duration-300 hover:scale-[1.02]"
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
          <div key={product.id} className="p-4 flex justify-between items-center hover:bg-gradient-to-r hover:from-gray-50 hover:to-pink-50 transition-colors duration-300">
            <div>
              <h3 className="font-medium text-gray-900">{product.name}</h3>
              {product.showDescription && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}
              {product.showPrice && (
                <p className="text-sm font-medium text-emerald-600">
                  ${product.price?.toFixed(2)}
                  {product.showUnit && product.unit && ` per ${product.unit}`}
                </p>
              )}
              {product.showMinOrder && (
                <p className="text-sm text-gray-500 mt-1">
                  Min order: {product.minOrder}
                  {product.showUnit && product.unit && ` ${product.unit}`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingProduct(product)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
              >
                <Edit2 className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => deleteProduct(product.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
              >
                <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}