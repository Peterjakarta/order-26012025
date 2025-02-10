import React, { useState } from 'react';
import { FileDown, Calculator, AlertCircle, ClipboardList } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { useStore } from '../../../store/StoreContext';
import { generateProductionRecipePDF, generateProductionChecklistPDF, generateOrderListPDF } from '../../../utils/pdfGenerator';
import OrderItem from '../order/OrderItem';
import OrderCompletion from '../order/OrderCompletion';
import type { Order } from '../../../types/types';
import { getInitialStartDate, getDefaultEndDate } from '../../../utils/dateUtils';

interface ProductionListProps {
  startDate: string;
  endDate: string;
  onSchedule: (orderId: string, startDate: string, endDate: string) => Promise<void>;
  onComplete?: (
    orderId: string, 
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => Promise<void>;
  onRemove?: (orderId: string) => Promise<void>;
}

export default function ProductionList({ 
  startDate, 
  endDate, 
  onSchedule,
  onComplete,
  onRemove
}: ProductionListProps) {
  const [error, setError] = useState<string | null>(null);
  const [schedulingOrder, setSchedulingOrder] = useState<Order | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState(endDate);
  const { products, recipes, ingredients } = useStore();
  const { orders, loading, removeOrder } = useOrders();
  
  const handleDownloadOrderList = () => {
    try {
      const doc = generateOrderListPDF(relevantOrders, products);
      doc.save('production-orders.pdf');
    } catch (err) {
      console.error('Error generating order list PDF:', err);
      setError('Failed to generate order list PDF');
    }
  };

  // Add loading state handling
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  // Filter orders that are pending or in production
  const relevantOrders = orders.filter(order => 
    order.status === 'pending' || 
    order.status === 'processing'
  ).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const handleScheduleProduction = async (orderId: string) => {
    try {
      setError(null);
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSchedulingOrder(order);
        setSelectedStartDate(startDate);
        setSelectedEndDate(endDate);
      }
    } catch (err) {
      console.error('Error scheduling production:', err);
      setError('Failed to schedule production');
    }
  };

  const handleDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setSelectedStartDate(date);
      // If end date is before new start date, update it
      if (new Date(selectedEndDate) < new Date(date)) {
        setSelectedEndDate(date);
      }
    } else {
      // Only allow end date after start date
      if (new Date(date) >= new Date(selectedStartDate)) {
        setSelectedEndDate(date);
      }
    }
  };

  const handleDownloadRecipePDF = (order: Order) => {
    try {
      const doc = generateProductionRecipePDF(order, products, recipes, ingredients);
      doc.save(`production-recipes-${order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Error generating recipe PDF:', err);
      setError('Failed to generate recipe PDF');
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    try {
      setError(null);
      
      // First try to find the order
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Remove the order
      await removeOrder(orderId);
      
      // Call the parent's onRemove if provided
      if (onRemove) {
        await onRemove(orderId);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error removing order:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove order');
    }
  };

  const handleDownloadChecklist = (order: Order) => {
    try {
      const doc = generateProductionChecklistPDF(order, products);
      doc.save(`production-checklist-${order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Error generating checklist PDF:', err);
      setError('Failed to generate checklist PDF');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {relevantOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No orders scheduled for production</p>
          </div>
        ) : (
          relevantOrders.map(order => (
          <OrderItem
            key={order.id}
            order={order}
            onRemove={() => handleRemoveOrder(order.id)}
            onUpdateStatus={async (status, producedQuantities, stockQuantities, rejectQuantities, rejectNotes) => {
              if (onComplete) {
                await onComplete(order.id, producedQuantities || {}, stockQuantities || {}, rejectQuantities || {}, rejectNotes || {});
              }
            }}
            onScheduleProduction={() => handleScheduleProduction(order.id)}
            extraActions={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-lg border border-gray-100">
                  <button
                    onClick={() => handleDownloadChecklist(order)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                    title="Download Production Checklist"
                  >
                    <ClipboardList className="w-4 h-4 text-pink-500 group-hover:text-pink-600" />
                    <span className="hidden sm:inline">Checklist</span>
                  </button>
                  <button
                    onClick={() => handleDownloadRecipePDF(order)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                    title="Download Recipe PDF"
                  >
                    <Calculator className="w-4 h-4 text-purple-500 group-hover:text-purple-600" />
                    <span className="hidden sm:inline">Recipe</span>
                  </button>
                  <button
                    onClick={() => {
                      const doc = generateOrderListPDF([order], products);
                      doc.save(`order-list-${order.id.slice(0, 8)}.pdf`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
                    title="Download Order List"
                  >
                    <FileDown className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                    <span className="hidden sm:inline">Order</span>
                  </button>
                </div>
              </div>
            }
          />
          ))
        )}
      </div>

      {/* Production Scheduling Dialog */}
      {schedulingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-6">
            <h3 className="text-lg font-medium">Schedule Production</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  min={startDate}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={selectedEndDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  min={selectedStartDate}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setSchedulingOrder(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await onSchedule(schedulingOrder.id, selectedStartDate, selectedEndDate);
                    setSchedulingOrder(null);
                  } catch (err) {
                    setError('Failed to schedule production');
                  }
                }}
                disabled={!selectedStartDate || !selectedEndDate}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Schedule Production
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}