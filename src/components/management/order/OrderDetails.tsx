import React from 'react';
import { Calendar, User, FileText } from 'lucide-react';
import type { Order } from '../../../types/types';
import { branches } from '../../../data/branches';
import { formatDate } from '../../../utils/dateUtils';

interface OrderDetailsProps {
  order: Order;
}

export default function OrderDetails({ order }: OrderDetailsProps) {
  const branch = branches.find(b => b.id === order.branchId);
  
  return (
    <div className="flex-grow">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg">{branch?.name}</h3>
        <span className="text-sm text-gray-500">#{order.id.slice(0, 8)}</span>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <User className="w-4 h-4" />
          Ordered by: {order.orderedBy}
        </p>
        {order.poNumber && (
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            PO Number: {order.poNumber}
          </p>
        )}
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Order Date: {formatDate(order.orderDate)}
        </p>
        {order.deliveryDate && (
          <p className="text-sm text-gray-600">
            Delivery: {formatDate(order.deliveryDate)}
          </p>
        )}
      </div>
      {order.notes && (
        <p className="text-sm text-gray-600 mt-2">
          Notes: {order.notes}
        </p>
      )}
    </div>
  );
}