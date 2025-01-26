import React, { useState } from 'react';
import type { ProductCategory, OrderItem } from '../types/types';
import ProductCategory from './ProductCategory';
import { useStore } from '../store/StoreContext';

interface ProductCategoryListProps {
  orderItems: OrderItem[];
  onQuantityChange: (productId: string, quantity: number) => void;
}

export default function ProductCategoryList({
  orderItems,
  onQuantityChange
}: ProductCategoryListProps) {
  const { categoryOrder } = useStore();
  const [expandedCategory, setExpandedCategory] = useState<ProductCategory | null>(null);

  const handleCategoryClick = (category: ProductCategory) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div className="space-y-3">
      {categoryOrder.map(category => (
        <ProductCategory
          key={category}
          category={category}
          orderItems={orderItems}
          onQuantityChange={onQuantityChange}
          isExpanded={expandedCategory === category}
          onToggle={(e: React.MouseEvent) => {
            e.preventDefault();
            handleCategoryClick(category);
          }}
        />
      ))}
    </div>
  );
}