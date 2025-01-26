import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Product } from '../types/types';
import { useStore } from '../store/StoreContext';
import ProductSelect from './ProductSelect';

interface ProductCategoryProps {
  category: string;
  onQuantityChange: (productId: string, quantity: number) => void;
  orderItems: { productId: string; quantity: number }[];
  isExpanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
}

export default function ProductCategory({ 
  category, 
  onQuantityChange,
  orderItems,
  isExpanded,
  onToggle
}: ProductCategoryProps) {
  const { categories, products } = useStore();
  const categoryInfo = categories[category];
  const categoryProducts = products.filter(p => p.category === category);
  
  const activeProducts = orderItems.filter(item => 
    categoryProducts.some(p => p.id === item.productId && item.quantity > 0)
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        type="button"
        className="w-full px-4 py-3 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{categoryInfo.name}</h3>
          </div>
        </div>
        {activeProducts.length > 0 && (
          <span className="bg-pink-100 text-pink-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {activeProducts.length} selected
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t divide-y">
          {categoryProducts.map(product => (
            <ProductSelect
              key={product.id}
              product={product}
              quantity={orderItems.find(item => item.productId === product.id)?.quantity || 0}
              onQuantityChange={onQuantityChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}