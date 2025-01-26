import React from 'react';
import type { Product } from '../types/types';
import ProductInfo from './product/ProductInfo';
import QuantitySelector from './product/QuantitySelector';

interface ProductSelectProps {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export default function ProductSelect({ product, quantity, onQuantityChange }: ProductSelectProps) {
  return (
    <div className="flex items-center p-4 bg-white gap-4">
      <ProductInfo product={product} />
      <QuantitySelector
        product={product}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
      />
    </div>
  );
}