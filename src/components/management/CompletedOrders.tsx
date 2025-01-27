import React, { useState } from 'react';
import { CheckCircle2, FileDown, RotateCcw, FileSpreadsheet, Calculator } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useStore } from '../../store/StoreContext';
import { useBranches } from '../../hooks/useBranches';
import OrderItem from './order/OrderItem';
import { generateOrderExcel, saveWorkbook } from '../../utils/excelGenerator';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import ConfirmDialog from '../common/ConfirmDialog';
import IngredientUsageCalculator from './order/IngredientUsageCalculator';

export default function CompletedOrders() {
  const { orders, removeOrder, updateOrderStatus } = useOrders();
  const { products } = useStore();
  const { branches } = useBranches();
  const [poNumber, setPoNumber] = useState<string>('');
  const [reopeningOrder, setReopeningOrder] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showIngredientCalculator, setShowIngredientCalculator] = useState(false);
  
  // Filter only completed orders and sort by completion date
  const completedOrders = orders
    .filter(order => order.status === 'completed')
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  const handleUpdateStatus = async (
    orderId: string, 
    status: Order['status'], 
    producedQuantities?: Record<string, number>
  ) => {
    await updateOrderStatus(orderId, status, producedQuantities);
  };

  const handleDownloadExcel = (order: Order) => {
    const wb = generateOrderExcel(order, products, poNumber);
    saveWorkbook(wb, `order-${order.orderNumber || order.id.slice(0, 8)}.xlsx`);
  };

  const handleDownloadPDF = (order: Order) => {
    const doc = generateOrderPDF(order, products, poNumber);
    doc.save(`order-${order.orderNumber || order.id.slice(0, 8)}.pdf`);
  };

  const handleReopenOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'pending');
      setReopeningOrder(null);
    } catch (error) {
      console.error('Error reopening order:', error);
      alert('Failed to reopen order. Please try again.');
    }
  };

  const handleToggleSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const selectedOrdersData = completedOrders.filter(order => 
    selectedOrders.has(order.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold">Completed Orders</h2>
        </div>
        <div className="flex items-center gap-4">
          {selectedOrders.size > 0 && (
            <button
              onClick={() => setShowIngredientCalculator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              <Calculator className="w-4 h-4" />
              Calculate Ingredients ({selectedOrders.size})
            </button>
          )}
          <div>
            <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
              PO Number
            </label>
            <input
              type="text"
              id="poNumber"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Optional"
              className="w-40 p-2 border rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {completedOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No completed orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedOrders.map(order => (
            <div key={order.id} className="relative">
              <div className="absolute left-4 top-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedOrders.has(order.id)}
                  onChange={() => handleToggleSelect(order.id)}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
              </div>
              <div className="pl-12">
                <OrderItem 
                  order={order} 
                  onRemove={() => removeOrder(order.id)}
                  onUpdateStatus={handleUpdateStatus}
                  selected={selectedOrders.has(order.id)}
                  extraActions={
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadExcel(order)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Download Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(order)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Download PDF"
                      >
                        <FileDown className="w-4 h-4" />
                        PDF
                      </button>
                      <button
                        onClick={() => setReopeningOrder(order.id)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Reopen order for production"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reopen
                      </button>
                    </div>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!reopeningOrder}
        title="Reopen Order"
        message="Are you sure you want to reopen this order for production? This will reset the order status and clear any production dates."
        onConfirm={() => reopeningOrder && handleReopenOrder(reopeningOrder)}
        onCancel={() => setReopeningOrder(null)}
      />

      {showIngredientCalculator && (
        <IngredientUsageCalculator
          selectedOrders={selectedOrdersData}
          onClose={() => setShowIngredientCalculator(false)}
        />
      )}
    </div>
  );
}