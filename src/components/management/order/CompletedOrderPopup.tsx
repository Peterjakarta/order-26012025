import React, { useState } from 'react';
import { X, Printer, Mail, FileDown } from 'lucide-react';
import type { Order } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { useOrderActions } from '../../../hooks/useOrderActions';
import { branches } from '../../../data/branches';
import { formatDate } from '../../../utils/dateUtils';

interface CompletedOrderPopupProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export default function CompletedOrderPopup({ 
  order, 
  isOpen, 
  onClose 
}: CompletedOrderPopupProps) {
  const { products } = useStore();
  const { printOrder, emailOrder, downloadPDF } = useOrderActions();
  const [poNumber, setPoNumber] = useState('');
  const branch = branches.find(b => b.id === order.branchId);

  if (!isOpen) return null;

  const handlePrint = () => {
    printOrder(order, poNumber);
  };

  const handleEmail = () => {
    emailOrder(order, poNumber);
  };

  const handleDownloadPDF = () => {
    downloadPDF(order, poNumber);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Order Details</h2>
            <p className="text-sm text-gray-600">#{order.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter PO number"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><span className="font-medium">Branch:</span> {branch?.name}</p>
            <p><span className="font-medium">Ordered By:</span> {order.orderedBy}</p>
            <p><span className="font-medium">Order Date:</span> {new Date(order.orderDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}</p>
            {order.poNumber && (
              <p><span className="font-medium">PO Number:</span> {order.poNumber}</p>
            )}
            <p><span className="font-medium">Order Date:</span> {formatDate(order.orderDate)}</p>
            {order.deliveryDate && (
              <p><span className="font-medium">Delivery Date:</span> {formatDate(order.deliveryDate)}</p>
            )}
            {order.completedAt && (
              <p><span className="font-medium">Completed:</span> {formatDate(order.completedAt)}</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Products</h3>
            <div className="divide-y border rounded-lg">
              {order.products.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                return (
                  <div key={item.productId} className="p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          Ordered: {item.quantity} {product.unit}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium ${
                          (item.producedQuantity || 0) < item.quantity 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                        }`}>
                          Produced: {item.producedQuantity || 0} {product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {order.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="border-t p-6 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <FileDown className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}