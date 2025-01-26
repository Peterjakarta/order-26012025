import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, List, AlertCircle, Plus } from 'lucide-react';
import { useOrders } from '../../../hooks/useOrders';
import { useStore } from '../../../store/StoreContext';
import ProductionCalendar from './ProductionCalendar';
import ProductionList from './ProductionList';
import OrderSelector from './OrderSelector';

type ViewMode = 'calendar' | 'list';

function getInitialStartDate(): string {
  const today = new Date();
  if (today.getHours() >= 14) {
    today.setDate(today.getDate() + 1);
  }
  while (today.getDay() === 0 || today.getDay() === 6) {
    today.setDate(today.getDate() + 1);
  }
  return today.toISOString().split('T')[0];
}

function getDefaultEndDate(startDate: string): string {
  const end = new Date(startDate);
  end.setDate(end.getDate() + 4);
  while (end.getDay() === 0 || end.getDay() === 6) {
    end.setDate(end.getDate() + 1);
  }
  return end.toISOString().split('T')[0];
}

export default function ProductionPlanning() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderProduction } = useOrders();
  const { products } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [startDate, setStartDate] = useState<string>(getInitialStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate(getInitialStartDate()));
  const [error, setError] = useState<string>('');
  const [showOrderSelector, setShowOrderSelector] = useState(false);

  const orderIds = orderId?.split(',') || [];
  const selectedOrders = orders.filter(order => orderIds.includes(order.id));

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setError('');
    const newEndDate = getDefaultEndDate(date);
    setEndDate(newEndDate);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setError('');
    if (new Date(date) < new Date(startDate)) {
      setError('End date cannot be before start date');
    }
  };

  const handleAddOrders = useCallback((newOrderIds: string[]) => {
    const allOrderIds = [...new Set([...orderIds, ...newOrderIds])];
    navigate(`/management/production/${allOrderIds.join(',')}`);
    setShowOrderSelector(false);
  }, [orderIds, navigate]);

  const handleSaveProduction = async () => {
    try {
      setError('');
      await Promise.all(
        selectedOrders.map(order => 
          updateOrderProduction(order.id, startDate, endDate)
        )
      );
      navigate('/management/orders');
    } catch (err) {
      console.error('Error saving production schedule:', err);
      setError('Failed to save production schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Production Schedule
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              viewMode === 'list' 
                ? 'bg-pink-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4" />
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md ${
              viewMode === 'calendar' 
                ? 'bg-pink-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendar View
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-lg">Production Planning</h3>
              <p className="text-sm text-gray-500">
                {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowOrderSelector(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Plus className="w-4 h-4" />
                Add Orders
              </button>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    min={getInitialStartDate()}
                    className="p-2 border rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    min={startDate}
                    className="p-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {viewMode === 'calendar' ? (
          <ProductionCalendar
            startDate={startDate}
            endDate={endDate}
            orders={selectedOrders}
            products={products}
          />
        ) : (
          <ProductionList
            startDate={startDate}
            endDate={endDate}
            orders={selectedOrders}
            products={products}
          />
        )}

        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-end">
            <button
              onClick={handleSaveProduction}
              disabled={!startDate || !endDate || !!error || selectedOrders.length === 0}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
            >
              Save Production Schedule
            </button>
          </div>
        </div>
      </div>

      {showOrderSelector && (
        <OrderSelector
          existingOrderIds={orderIds}
          onSelect={handleAddOrders}
          onClose={() => setShowOrderSelector(false)}
        />
      )}
    </div>
  );
}