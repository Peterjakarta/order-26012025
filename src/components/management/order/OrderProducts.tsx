import React from 'react';
import type { Order } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';
import { calculateExpiryDate } from '../../../utils/dateUtils';

interface OrderProductsProps {
  order: Order;
}

export default function OrderProducts({ order }: OrderProductsProps) {
  const { products } = useStore();

  return (
    <div className="mt-2">
      <h4 className="text-sm font-medium mb-2">Products:</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="text-gray-600">
            <tr>
              <th className="text-left py-2">Product</th>
              <th className="text-right py-2">Ordered</th>
              <th className="text-right py-2">Produced</th>
              <th className="text-right py-2">Stock</th>
              <th className="text-right py-2">Reject</th>
              <th className="text-left py-2">Reject Notes</th>
              <th className="text-right py-2">Production Date</th>
              <th className="text-right py-2">Expiry Date</th>
              <th className="text-right py-2">Mould</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 divide-y">
            {order.products.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;

              const mouldInfo = calculateMouldCount(product.category, item.quantity);
              const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);
              const expiryDate = order.completedAt ? calculateExpiryDate(order.completedAt, product.category) : null;
              
              return (
                <tr key={item.productId}>
                  <td className="py-2">
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({product.category})
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-2 whitespace-nowrap">
                    {item.quantity} {product.unit}
                  </td>
                  <td className={`text-right py-2 whitespace-nowrap ${
                    (item.producedQuantity || 0) < item.quantity ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {item.producedQuantity || 0} {product.unit}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap">
                    {item.stockQuantity || 0} {product.unit}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap text-red-600">
                    {item.rejectQuantity || 0} {product.unit}
                  </td>
                  <td className="py-2">
                    {item.rejectNotes || '-'}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap">
                    {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap">
                    {expiryDate ? expiryDate.toLocaleDateString() : '-'}
                  </td>
                  <td className="text-right py-2 whitespace-nowrap font-medium">
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
  );
}