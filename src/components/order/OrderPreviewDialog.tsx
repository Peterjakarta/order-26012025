import React from 'react';
import { FileDown } from 'lucide-react';
import type { Order } from '../../types/types';
import { useStore } from '../../store/StoreContext';
import { useOrderActions } from '../../hooks/useOrderActions';
import { useBranches } from '../../hooks/useBranches';
import OrderPreviewHeader from './preview/OrderPreviewHeader';
import OrderPreviewProducts from './preview/OrderPreviewProducts';

interface OrderPreviewDialogProps {
  isOpen: boolean;
  branchId: string;
  orderedBy: string;
  orderDate: string;
  orderItems: OrderItem[];
  poNumber?: string;
  notes?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function OrderPreviewDialog({
  isOpen,
  branchId,
  orderedBy,
  orderDate,
  orderItems,
  poNumber,
  notes,
  onConfirm,
  onCancel
}: OrderPreviewDialogProps) {
  const { products } = useStore();
  const { downloadPDF } = useOrderActions();
  const { branches } = useBranches();
  const branch = branches.find(b => b.id === branchId);
  
  if (!isOpen) return null;

  // Create a temporary order object for actions
  const previewOrder: Order = {
    id: 'preview',
    orderNumber: 'PREVIEW',
    branchId,
    orderedBy,
    orderDate,
    poNumber,
    products: orderItems,
    notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
    deliveryDate: orderDate // Set delivery date same as order date for preview
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Order Preview</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <OrderPreviewHeader
            branch={branch}
            orderedBy={orderedBy}
            orderDate={orderDate}
            poNumber={poNumber}
            notes={notes}
          />

          <OrderPreviewProducts
            orderItems={orderItems}
            products={products}
          />
        </div>

        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <button
            onClick={() => downloadPDF(previewOrder)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <FileDown className="w-4 h-4" />
            Download PDF
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Edit
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}