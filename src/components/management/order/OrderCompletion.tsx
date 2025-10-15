import React, { useState, useEffect } from 'react';
import { X, Printer, Mail, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Order } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { useOrderActions } from '../../../hooks/useOrderActions';
import { useBranches } from '../../../hooks/useBranches';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';

interface OrderCompletionProps {
  order: Order;
  onComplete: (
    orderId: string,
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>,
    completionDate?: string,
    batchNumber?: string
  ) => Promise<void>;
  onClose?: () => void;
}

export default function OrderCompletion({ order, onComplete, onClose }: OrderCompletionProps) {
  const { products } = useStore();
  const { branches } = useBranches();
  const { printOrder, emailOrder, downloadPDF } = useOrderActions();
  const [poNumber, setPoNumber] = useState('');
  const [producedQuantities, setProducedQuantities] = useState<Record<string, number>>(() => {
    return order.products.reduce((acc, item) => {
      acc[item.productId] = item.producedQuantity || item.quantity;
      return acc;
    }, {} as Record<string, number>);
  });
  const [stockQuantities, setStockQuantities] = useState<Record<string, number>>(() => {
    return order.products.reduce((acc, item) => {
      acc[item.productId] = item.stockQuantity || 0;
      return acc;
    }, {} as Record<string, number>);
  });
  const [rejectQuantities, setRejectQuantities] = useState<Record<string, number>>(() => {
    return order.products.reduce((acc, item) => {
      acc[item.productId] = item.rejectQuantity || 0;
      return acc;
    }, {} as Record<string, number>);
  });
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>(() => {
    return order.products.reduce((acc, item) => {
      acc[item.productId] = item.rejectNotes || '';
      return acc;
    }, {} as Record<string, string>);
  });
  const [completionDate, setCompletionDate] = useState(() => {
    if (order.completedAt) {
      return order.completedAt.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [batchNumber, setBatchNumber] = useState(order.batchNumber || '');
  const [error, setError] = useState<string>('');

  const branch = branches.find(b => b.id === order.branchId);
  const isEditing = order.status === 'completed';

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  const handleQuantityChange = (productId: string, type: 'produced' | 'stock' | 'reject', quantity: string) => {
    const numQuantity = parseInt(quantity, 10);
    if (isNaN(numQuantity) || numQuantity < 0) return;

    const setQuantity = {
      produced: setProducedQuantities,
      stock: setStockQuantities,
      reject: setRejectQuantities
    }[type];

    setQuantity(prev => ({
      ...prev,
      [productId]: numQuantity
    }));
  };

  const handleRejectNotesChange = (productId: string, notes: string) => {
    setRejectNotes(prev => ({
      ...prev,
      [productId]: notes
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');

      await onComplete(order.id, producedQuantities, stockQuantities, rejectQuantities, rejectNotes, completionDate, batchNumber);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
    }
  };

  const handlePrint = () => {
    printOrder(order, poNumber);
  };

  const handleEmail = () => {
    emailOrder(order, poNumber);
  };

  const handleDownload = () => {
    const tempOrder: Order = {
      ...order,
      products: order.products.map(item => ({
        ...item,
        producedQuantity: producedQuantities[item.productId],
        stockQuantity: stockQuantities[item.productId],
        rejectQuantity: rejectQuantities[item.productId],
        rejectNotes: rejectNotes[item.productId]
      }))
    };
    
    downloadPDF(tempOrder, poNumber);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-lg">
            {isEditing ? 'Edit Completed Order' : 'Complete Order'}
          </h4>
          <p className="text-sm text-gray-600 mt-1">Branch: {branch?.name}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Press ESC to close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* PO Number Input */}
      <div>
        <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
          PO Number
        </label>
        <input
          type="text"
          id="poNumber"
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
          placeholder="Enter PO number (optional)"
          className="w-full p-2 border rounded-md"
        />
      </div>

      {/* Completion Date Input */}
      <div>
        <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700 mb-1">
          {isEditing ? 'Production Date' : 'Completion Date'}
        </label>
        <input
          type="date"
          id="completionDate"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {isEditing ? 'Update the production date' : 'Set when this order was actually completed'}
        </p>
      </div>

      {/* Batch Number Input */}
      <div>
        <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Batch Number (HACCP)
        </label>
        <input
          type="text"
          id="batchNumber"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          placeholder="e.g., B20250130-001"
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Assign a batch number for HACCP traceability
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-right py-3 px-4">Ordered</th>
              <th className="text-right py-3 px-4">Produced</th>
              <th className="text-right py-3 px-4">Stock</th>
              <th className="text-right py-3 px-4">Reject</th>
              <th className="text-left py-3 px-4">Reject Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.products.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;

              const mouldInfo = calculateMouldCount(product.category, item.quantity);
              const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);

              return (
                <tr key={item.productId}>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        Ordered: {item.quantity} {product.unit}
                        {showMould && (
                          <span className={`ml-2 ${
                            isBonBonCategory(product.category) ? 'text-pink-600' : 'text-blue-600'
                          }`}>
                            {mouldInfo}
                          </span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4">
                    {item.quantity} {product.unit}
                  </td>
                  <td className="text-right py-4 px-4">
                    <input
                      type="number"
                      value={producedQuantities[item.productId] || 0}
                      onChange={(e) => handleQuantityChange(item.productId, 'produced', e.target.value)}
                      min="0"
                      className="w-24 px-3 py-1.5 border rounded-md text-right"
                    />
                    <span className="ml-2 text-gray-600">{product.unit}</span>
                  </td>
                  <td className="text-right py-4 px-4">
                    <input
                      type="number"
                      value={stockQuantities[item.productId] || 0}
                      onChange={(e) => handleQuantityChange(item.productId, 'stock', e.target.value)}
                      min="0"
                      className="w-24 px-3 py-1.5 border rounded-md text-right"
                    />
                    <span className="ml-2 text-gray-600">{product.unit}</span>
                  </td>
                  <td className="text-right py-4 px-4">
                    <input
                      type="number"
                      value={rejectQuantities[item.productId] || 0}
                      onChange={(e) => handleQuantityChange(item.productId, 'reject', e.target.value)}
                      min="0"
                      className="w-24 px-3 py-1.5 border rounded-md text-right text-red-600"
                    />
                    <span className="ml-2 text-gray-600">{product.unit}</span>
                  </td>
                  <td className="py-4 px-4">
                    <input
                      type="text"
                      value={rejectNotes[item.productId] || ''}
                      onChange={(e) => handleRejectNotesChange(item.productId, e.target.value)}
                      placeholder="Enter reject notes"
                      className={`w-full px-3 py-1.5 border rounded-md ${
                        rejectQuantities[item.productId] > 0 ? 'border-red-200' : ''
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
          >
            <FileDown className="w-4 h-4" />
            Download
          </button>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            {isEditing ? 'Update Quantities' : 'Mark as Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}