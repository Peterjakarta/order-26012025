import React from 'react';
import { formatIDR } from '../../utils/currencyFormatter';
import type { Product } from '../../types/types';

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const showUnit = product.showUnit && product.unit;
  
  return (
    <div className="flex-grow">
      <h4 className="font-medium text-gray-900">{product.name}</h4>
      {product.showDescription && product.description && (
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
      )}
      {product.showPrice && product.price !== undefined && (
        <p className="text-sm font-medium text-pink-600 mt-1">
          {formatIDR(product.price)}{showUnit && ` per ${product.unit}`}
        </p>
      )}
      {product.showMinOrder && product.minOrder !== undefined && (
        <p className="text-xs text-gray-500 mt-0.5">
          Minimum order: {product.minOrder}{showUnit && ` ${product.unit}`}
        </p>
      )}
    </div>
  );
}