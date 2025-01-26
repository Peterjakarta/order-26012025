import React from 'react';
import type { Branch } from '../../../types/types';

interface OrderPreviewHeaderProps {
  branch: Branch | undefined;
  orderedBy: string;
  orderDate: string;
  poNumber?: string;
  notes?: string;
}

export default function OrderPreviewHeader({ 
  branch, 
  orderedBy, 
  orderDate,
  poNumber,
  notes 
}: OrderPreviewHeaderProps) {
  return (
    <div>
      <h3 className="font-medium mb-2">Order Details</h3>
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Branch:</span>
          <span className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded-md text-sm">
            {branch?.name || 'Unknown Branch'}
          </span>
        </div>
        <p className="text-gray-700">
          <span className="font-medium">Ordered By:</span> {orderedBy}
        </p>
        {poNumber && (
          <p className="text-gray-700">
            <span className="font-medium">PO Number:</span> {poNumber}
          </p>
        )}
        <p className="text-gray-700">
          <span className="font-medium">Order Date:</span>{' '}
          {new Date(orderDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        {notes && (
          <p className="text-gray-700">
            <span className="font-medium">Notes:</span> {notes}
          </p>
        )}
      </div>
    </div>
  );
}