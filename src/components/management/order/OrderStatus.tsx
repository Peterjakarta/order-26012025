import React, { useState } from 'react';
import { Edit } from 'lucide-react';
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
    await onUpdateStatus(
      'completed', 
      producedQuantities, 
      stockQuantities,
      rejectQuantities,
      rejectNotes
    );
    setShowCompletion(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeClass()}`}>
          {order.status}
        </span>
        
        {order.status === 'completed' ? (
          <button
            onClick={() => setShowCompletion(true)}
            className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            Edit Quantities
          </button>
        ) : (
          <button
            onClick={() => setShowCompletion(true)}
            className="px-3 py-1 text-sm border border-green-200 text-green-600 rounded-md hover:bg-green-50"
          >
            Complete Order
          </button>
        )}
      </div>

      {showCompletion && (
        <OrderCompletion
          order={order}
          onComplete={handleComplete}
          onClose={() => setShowCompletion(false)}
        />
      )}
    </div>
  );
}