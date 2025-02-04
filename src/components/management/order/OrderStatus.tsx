import React, { useState } from 'react';
import { Edit, CheckCircle2 } from 'lucide-react';
import type { Order } from '../../../types/types';
import OrderCompletion from './OrderCompletion';

interface OrderStatusProps {
  order: Order;
  onUpdateStatus: (
    status: Order['status'], 
    producedQuantities?: Record<string, number>,
    stockQuantities?: Record<string, number>,
    rejectQuantities?: Record<string, number>,
    rejectNotes?: Record<string, string>
  ) => Promise<void>;
}

export default function OrderStatus({ order, onUpdateStatus }: OrderStatusProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadgeClass = () => {
    switch (order.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleComplete = async (
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => {
    setError(null);

    try {
      await onUpdateStatus(
        'completed', 
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes
      );
      setShowCompletion(false);
    } catch (err) {
      console.error('Error completing order:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete order');
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass()}`}>
          {order.status}
        </span>
        
        {order.status === 'completed' ? (
          <>
            <button
              onClick={() => setShowCompletion(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Edit Quantities
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowCompletion(true)}
            className="px-3 py-1 text-sm border border-green-200 text-green-600 rounded-md hover:bg-green-50"
          >
            <CheckCircle2 className="w-4 h-4 inline-block mr-1" />
            Complete Order
          </button>
        )}
      </div>

      {showCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <OrderCompletion
              order={order}
              onComplete={handleComplete}
              onClose={() => setShowCompletion(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}