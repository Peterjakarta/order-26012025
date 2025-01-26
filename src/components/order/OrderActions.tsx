import React from 'react';
import { Printer, Mail } from 'lucide-react';
import { useOrderActions } from '../../hooks/useOrderActions';
import type { Order } from '../../types/types';

interface OrderActionsProps {
  order: Order;
}

export default function OrderActions({ order }: OrderActionsProps) {
  const { printOrder, emailOrder } = useOrderActions();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => printOrder(order)}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
      <button
        onClick={() => emailOrder(order)}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
      >
        <Mail className="w-4 h-4" />
        Email
      </button>
    </div>
  );
}