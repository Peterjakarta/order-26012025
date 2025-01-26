import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Printer, FileDown, Mail, X } from 'lucide-react';
import type { Order } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { useOrderActions } from '../../../hooks/useOrderActions';
import { useBranches } from '../../../hooks/useBranches';

interface OrderCompletionProps {
  order: Order;
  onComplete: (
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
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
  const [error, setError] = useState<string>('');

  const branch = branches.find(b => b.id === order.branchId);

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
      await onComplete(producedQuantities, stockQuantities, rejectQuantities, rejectNotes);
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

  if (order.status === 'completed') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Order Completed</span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="font-medium text-gray-700">Branch: {branch?.name}</p>
          <p className="text-sm text-gray-600 mt-1">Order #{order.id.slice(0, 8)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Ordered</th>
                <th className="text-right py-2">Produced</th>
                <th className="text-right py-2">Stock</th>
                <th className="text-right py-2">Reject</th>
                <th className="text-left py-2">Reject Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.products.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                return (
                  <tr key={item.productId}>
                    <td className="py-3">
                      <span className="font-medium">{product.name}</span>
                    </td>
                    <td className="text-right py-3">
                      {item.quantity} {product.unit}
                    </td>
                    <td className={`text-right py-3 font-medium ${
                      (item.producedQuantity || 0) < item.quantity 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                    }`}>
                      {item.producedQuantity || 0} {product.unit}
                    </td>
                    <td className="text-right py-3 text-gray-600">
                      {item.stockQuantity || 0} {product.unit}
                    </td>
                    <td className="text-right py-3 text-red-600">
                      {item.rejectQuantity || 0} {product.unit}
                    </td>
                    <td className="py-3 text-gray-600">
                      {item.rejectNotes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-lg">
            {order.status === 'completed' ? 'Edit Completed Order' : 'Complete Order'}
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

              return (
                <tr key={item.productId}>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        Ordered: {item.quantity} {product.unit}
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
            {order.status === 'completed' ? 'Update Quantities' : 'Mark as Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}