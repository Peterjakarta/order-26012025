import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { Product } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import ProductForm from '../ProductForm';

interface ProductFormData {
  product: Omit<Product, 'id'>;
  recipe?: {
    yield: number;
    yieldUnit: string;
    ingredients: any[];
    shellIngredients: any[];
  };
  addAsIngredient: boolean;
  addAsProduct: boolean;
  ingredientData?: {
    usageUnit: string;
    packageSize: number;
    packageUnit: string;
    price: number;
  };
}

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  const { updateProduct, deleteProduct, reorderProducts } = useStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);

  const handleDragStart = (productId: string) => {
    setDraggedProduct(productId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedProduct || draggedProduct === targetId) return;

    const productIds = products.map(p => p.id);
    const draggedIndex = productIds.indexOf(draggedProduct);
    const targetIndex = productIds.indexOf(targetId);

    // Create new order
    const newOrder = [...productIds];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedProduct);

    // Update store with new order
    reorderProducts(products[0].category, newOrder);
    setDraggedProduct(null);
  };

  const handleSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data.product);
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No products in this category yet
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={() => setEditingProduct(null)}
        />
      )}
      
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map(product => (
          <div
            key={product.id}
            draggable
            onDragStart={() => handleDragStart(product.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(product.id)}
            className={`bg-white p-3 rounded-md shadow-sm space-y-2 cursor-move 
              ${draggedProduct === product.id ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-2">
              <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
              <div className="flex-grow">
                <div className="flex justify-between">
                  <h5 className="font-medium">{product.name}</h5>
                  {product.showPrice && product.price !== undefined && (
                    <span className="text-sm font-medium">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                {product.showDescription && product.description && (
                  <p className="text-sm text-gray-600">{product.description}</p>
                )}
                {(product.showMinOrder || product.showUnit) && (
                  <div className="text-sm text-gray-500">
                    {product.showMinOrder && product.minOrder !== undefined && (
                      <>Min order: {product.minOrder}</>
                    )}
                    {product.showUnit && product.unit && (
                      <> {product.unit}</>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}