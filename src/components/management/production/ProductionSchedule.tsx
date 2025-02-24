import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package2, AlertCircle, Calendar, List } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { useStore } from '../../../store/StoreContext';
import { getInitialStartDate, getDefaultEndDate } from '../../../utils/dateUtils';
import ProductionList from './ProductionList';
import ProductionCalendar from './ProductionCalendar';

type ViewMode = 'list' | 'calendar';

export default function ProductionSchedule() {
  const { orderId } = useParams();
  const { orders, updateOrderStatus, updateOrderProduction } = useOrders();
  const { products } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [error, setError] = useState<string | null>(null);

  const startDate = getInitialStartDate();
  const endDate = getDefaultEndDate(startDate);

  // Get all non-completed orders that either:
  // 1. Are in the URL parameters (newly selected orders)
  // 2. Have production dates set (already scheduled orders)
  const orderIds = orderId?.split(',') || [];
  const relevantOrders = orders.filter(order => 
    (orderIds.includes(order.id) || (order.productionStartDate && order.productionEndDate)) &&
    order.status !== 'completed'
  );

  const handleSchedule = async (orderId: string, startDate: string, endDate: string) => {
    try {
      setError(null);
      await updateOrderProduction(orderId, startDate, endDate);
    } catch (err) {
      console.error('Error scheduling production:', err);
      setError('Failed to schedule production');
      throw err;
    }
  };

  const handleComplete = async (
    orderId: string, 
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => {
    try {
      setError(null);
      await updateOrderStatus(
        orderId, 
        'completed', 
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes
      );
    } catch (err) {
      console.error('Error completing order:', err);
      setError('Failed to complete order');
      throw err;
    }
  };

  const handleRemoveFromProduction = async (orderId: string) => {
    try {
      setError(null);
      await updateOrderProduction(orderId, '', ''); // Clear production dates
      await updateOrderStatus(orderId, 'pending'); // Reset status to pending
    } catch (err) {
      console.error('Error removing from production:', err);
      setError('Failed to remove from production');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          Production Schedule
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              viewMode === 'list' 
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:from-pink-700 hover:to-purple-700' 
                : 'text-gray-600 hover:bg-gray-50/80 hover:shadow-sm'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              viewMode === 'calendar' 
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg hover:from-pink-700 hover:to-purple-700' 
                : 'text-gray-600 hover:bg-gray-50/80 hover:shadow-sm'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm">
        {viewMode === 'calendar' ? (
          <ProductionCalendar
            orders={relevantOrders}
            products={products}
            onScheduleOrder={handleSchedule}
          />
        ) : (
          <ProductionList
            startDate={startDate}
            endDate={endDate}
            orders={relevantOrders}
            products={products}
            onSchedule={handleSchedule}
            onComplete={handleComplete}
            onRemove={handleRemoveFromProduction}
          />
        )}
      </div>
    </div>
  );
}