import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Copy, Upload } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import ProductForm from './ProductForm';
import BulkProductImport from './product-form/BulkProductImport';
import type { Product } from '../../types/types';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [copyingProduct, setCopyingProduct] = useState<Product | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const handleSubmit = async (data: Omit<Product, 'id'>) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        setEditingProduct(null);
      } else if (copyingProduct) {
        await addProduct(data);
        setCopyingProduct(null);
      } else {
        await addProduct(data);
        setIsAddingProduct(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleCopyProduct = (product: Product) => {
    setCopyingProduct({
      ...product,
      name: `${product.name} (Copy)`
    });
    
    // Show "Copied" indicator briefly
    setJustCopied(product.id);
    setTimeout(() => setJustCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-6 h-6" />
          Products
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {showBulkImport && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <BulkProductImport onComplete={() => setShowBulkImport(false)} />
        </div>
      )}

      {isAddingProduct && (
        <ProductForm
          product={null}
          onSubmit={handleSubmit}
          onCancel={() => setIsAddingProduct(false)}
        />
      )}

      {copyingProduct && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Copy Product</h3>
          <ProductForm
            product={copyingProduct}
            onSubmit={handleSubmit}
            onCancel={() => setCopyingProduct(null)}
          />
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {products.map(product => (
          <div key={product.id}>
            {editingProduct?.id === product.id ? (
              <div className="p-4">
                <h3 className="text-lg font-medium mb-3">Edit Product</h3>
                <ProductForm
                  product={product}
                  onSubmit={handleSubmit}
                  onCancel={() => setEditingProduct(null)}
                />
              </div>
            ) : (
              <div className="p-4 flex justify-between items-center">
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
                    onClick={() => handleCopyProduct(product)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                    title="Copy product"
                  >
                    <Copy className="w-4 h-4" />
                    {justCopied === product.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}