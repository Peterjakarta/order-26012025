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
      <h4 className="font-medium">{product.name}</h4>
      {product.showDescription && product.description && (
        <p className="text-sm text-gray-600">{product.description}</p>
      )}
      {product.showPrice && product.price !== undefined && (
        <p className="text-sm font-medium text-gray-700 mt-1">
          {formatIDR(product.price)}{showUnit && ` per ${product.unit}`}
        </p>
      )}
      {product.showMinOrder && product.minOrder !== undefined && (
        <p className="text-sm text-gray-600">
          Minimum order: {product.minOrder}{showUnit && ` ${product.unit}`}
        </p>
      )}
    </div>
  );
}