import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import ProductForm from '../ProductForm';
import ProductList from './ProductList';
import BulkProductImport from '../product-form/BulkProductImport';
import type { ProductCategory } from '../../../types/types';

interface CategoryProductsProps {
  category: ProductCategory;
}

export default function CategoryProducts({ category }: CategoryProductsProps) {
  const { products, addProduct } = useStore();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  
  const categoryProducts = products.filter(p => p.category === category);

  const handleSubmit = async (data: any) => {
    try {
      await addProduct({
        ...data,
        category
      });
      setIsAddingProduct(false);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  return (
    <div className="border-t bg-gray-50 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Products in this category</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkImporting(true)}
            className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-white"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {isBulkImporting && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <BulkProductImport 
            category={category}
            onComplete={() => setIsBulkImporting(false)}
          />
        </div>
      )}

      {isAddingProduct && (
        <ProductForm
          product={null}
          initialCategory={category}
          onSubmit={handleSubmit}
          onCancel={() => setIsAddingProduct(false)}
        />
      )}

      <ProductList products={categoryProducts} />
    </div>
  );
}