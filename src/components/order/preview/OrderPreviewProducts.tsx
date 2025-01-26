import React from 'react';
import type { OrderItem, Product } from '../../../types/types';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';

interface OrderPreviewProductsProps {
  orderItems: OrderItem[];
  products: Product[];
}

export default function OrderPreviewProducts({ orderItems, products }: OrderPreviewProductsProps) {
  return (
    <div>
      <h3 className="font-medium mb-2">Products</h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-sm text-gray-600 border-b">
                <th className="text-left pb-2">Product</th>
                <th className="text-right pb-2 px-4">Quantity</th>
                <th className="text-right pb-2 px-4">Mould</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orderItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                const mouldInfo = calculateMouldCount(product.category, item.quantity);
                const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);
                
                return (
                  <tr key={item.productId} className="text-sm">
                    <td className="py-2">
                      <span className="font-medium">{product.name}</span>
                    </td>
                    <td className="text-right py-2 px-4">
                      {item.quantity} {product.unit}
                    </td>
                    <td className="text-right py-2 px-4 font-medium">
                      {showMould ? (
                        <span className={`${
                          isBonBonCategory(product.category) ? 'text-pink-600' : 'text-blue-600'
                        }`}>
                          {mouldInfo}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}