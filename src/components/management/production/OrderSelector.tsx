import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { branches } from '../../../data/branches';

interface OrderSelectorProps {
  existingOrderIds: string[];
  onSelect: (orderIds: string[]) => void;
  onClose: () => void;
}

export default function OrderSelector({ 
  existingOrderIds, 
  onSelect, 
  onClose 
}: OrderSelectorProps) {
  const { orders } = useOrders();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out completed orders and already selected orders
  const availableOrders = orders.filter(order => 
    order.status !== 'completed' && 
    !existingOrderIds.includes(order.id)
  );

  const handleSelect = (orderId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-medium">Add Orders to Production</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {availableOrders.length === 0 ? (
            <p className="text-center text-gray-500">No available orders to add</p>
          ) : (
            <div className="space-y-3">
              {availableOrders.map(order => {
                const branch = branches.find(b => b.id === order.branchId);
                const isSelected = selectedIds.has(order.id);
                
                return (
                  <label
                    key={order.id}
                    className={`
                      flex items-start gap-3 p-4 rounded-lg cursor-pointer
                      ${isSelected ? 'bg-pink-50 border-pink-200' : 'hover:bg-gray-50 border-transparent'}
                      border
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(order.id)}
                      className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{branch?.name}</h3>
                        <span className="text-sm text-gray-500">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
          >
            Add Selected Orders
          </button>
        </div>
      </div>
    </div>
  );
}