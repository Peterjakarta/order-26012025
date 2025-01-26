import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Order, OrderItem } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { useBranches } from '../../../hooks/useBranches';
import ProductCategoryList from '../../ProductCategoryList';

interface EditOrderDialogProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedOrder: Partial<Order>) => Promise<void>;
}

export default function EditOrderDialog({ 
  order, 
  isOpen, 
  onClose,
  onSave 
}: EditOrderDialogProps) {
  const { branches } = useBranches();
  const [orderedBy, setOrderedBy] = useState(order.orderedBy);
  const [branchId, setBranchId] = useState(order.branchId);
  const [orderDate, setOrderDate] = useState(order.orderDate);
  const [poNumber, setPoNumber] = useState(order.poNumber || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [orderItems, setOrderItems] = useState<OrderItem[]>(order.products);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await onSave({
        orderedBy,
        branchId,
        orderDate,
        poNumber: poNumber.trim(),
        notes,
        products: orderItems.filter(item => item.quantity > 0)
      });
      onClose();
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Edit Order</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordered By
                </label>
                <input
                  type="text"
                  value={orderedBy}
                  onChange={(e) => setOrderedBy(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Date
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  required
                  className="w-full p-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter PO number (optional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Products
              </label>
              <ProductCategoryList
                orderItems={orderItems}
                onQuantityChange={(productId, quantity) => {
                  setOrderItems(prev => {
                    const existing = prev.find(item => item.productId === productId);
                    if (!existing && quantity > 0) {
                      return [...prev, { productId, quantity }];
                    }
                    if (quantity === 0) {
                      return prev.filter(item => item.productId !== productId);
                    }
                    return prev.map(item => 
                      item.productId === productId ? { ...item, quantity } : item
                    );
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded-md"
                placeholder="Any special requirements or notes..."
              />
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}