import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  FileDown, 
  ChevronDown, 
  Calendar, 
  RefreshCw, 
  Edit2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Calculator,
  AlertCircle
} from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useStore } from '../../store/StoreContext';
import { useBranches } from '../../hooks/useBranches';
import OrderItem from './order/OrderItem';
import { generateOrderExcel, saveWorkbook } from '../../utils/excelGenerator';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import ConfirmDialog from '../common/ConfirmDialog';
import IngredientUsageCalculator from './order/IngredientUsageCalculator';
import { useLocation } from 'react-router-dom';
import { generateReport, generateReportExcel, generateReportPDF } from '../../utils/reportUtils';

export default function CompletedOrders() {
  const { orders, removeOrder, updateOrderStatus, refreshOrders } = useOrders();
  const { products, recipes, ingredients } = useStore();
  const { branches } = useBranches();
  const location = useLocation();
  const [poNumber, setPoNumber] = useState<string>('');
  const [reopeningOrder, setReopeningOrder] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showIngredientCalculator, setShowIngredientCalculator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [editingProductionDate, setEditingProductionDate] = useState<{
    orderId: string;
    date: string;
  } | null>(null);

  const ordersByMonth = React.useMemo(() => {
    const completedOrders = orders
      .filter(order => order.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.updatedAt);
        const dateB = new Date(b.completedAt || b.updatedAt);
        return dateB.getTime() - dateA.getTime();
      });
    
    const grouped = completedOrders.reduce((acc, order) => {
      const completedDate = new Date(order.completedAt || order.updatedAt);
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = completedDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthName,
          orders: []
        };
      }
      
      acc[monthKey].orders.push(order);
      return acc;
    }, {} as Record<string, { monthName: string; orders: Order[] }>);
    
    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, { monthName, orders }]) => ({
        monthKey: key,
        monthName,
        orders
      }));
  }, [orders]);

  useEffect(() => {
    if (ordersByMonth.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([ordersByMonth[0].monthKey]));
    }
  }, [ordersByMonth]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!hasInitialized) {
        setIsRefreshing(true);
        await refreshOrders();
        setIsRefreshing(false);
        setHasInitialized(true);
      }
    };
    
    initializeData();
  }, [refreshOrders, hasInitialized]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshOrders();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

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

  const handleUpdateProductionDate = async (orderId: string, newDate: string) => {
    try {
      setError(null);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await updateOrderStatus(orderId, 'completed', undefined, undefined, undefined, undefined, newDate);
      setEditingProductionDate(null);
      setSuccess('Production date updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating production date:', err);
      setError('Failed to update production date');
    }
  };

  const handleGenerateReport = () => {
    try {
      let filteredOrders = orders.filter(order => order.status === 'completed');
      if (startDate && endDate) {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.completedAt || order.updatedAt);
          return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });
      }

      const reportData = generateReport(filteredOrders, products, recipes, ingredients);

      const wb = generateReportExcel(reportData, products, ingredients, startDate, endDate);
      saveWorkbook(wb, 'production-report.xlsx');

      const doc = generateReportPDF(reportData, products, ingredients, startDate, endDate);
      doc.save('production-report.pdf');

      setSuccess('Reports generated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error generating reports:', err);
      setError('Failed to generate reports');
    }
  };

  const selectedOrdersData = orders.filter(order => 
    selectedOrders.has(order.id)
  );
  
  const expandAllMonths = () => {
    const allMonthKeys = ordersByMonth.map(group => group.monthKey);
    setExpandedMonths(new Set(allMonthKeys));
  };
  
  const collapseAllMonths = () => {
    setExpandedMonths(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold">Completed Orders</h2>
          {isRefreshing && (
            <span className="text-sm text-gray-500 flex items-center ml-2">
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              Refreshing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border rounded-md"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border rounded-md"
            />
            <button
              onClick={handleGenerateReport}
              disabled={!startDate || !endDate}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              Generate Report
            </button>
          </div>
          {selectedOrders.size > 0 && (
            <button
              onClick={() => setShowIngredientCalculator(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-pink-500 text-white rounded-md hover:bg-pink-600"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculate ({selectedOrders.size})
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={expandAllMonths}
              className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllMonths}
              className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              Collapse All
            </button>
          </div>
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

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <p>{success}</p>
        </div>
      )}

      {ordersByMonth.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No completed orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordersByMonth.map(monthGroup => {
            const isExpanded = expandedMonths.has(monthGroup.monthKey);
            
            return (
              <div key={monthGroup.monthKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleMonth(monthGroup.monthKey)}
                  className="w-full px-4 py-3 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                      <span className="font-medium text-lg">{monthGroup.monthName}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full font-medium">
                    {monthGroup.orders.length} order{monthGroup.orders.length !== 1 ? 's' : ''}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4 pt-0 space-y-4 border-t">
                    {monthGroup.orders.map(order => (
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
                              <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex items-center gap-2 mr-4">
                                  <span className="text-sm text-gray-600">
                                    Production Date: 
                                  </span>
                                  {editingProductionDate?.orderId === order.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="date"
                                        value={editingProductionDate.date}
                                        onChange={(e) => setEditingProductionDate({
                                          orderId: order.id,
                                          date: e.target.value
                                        })}
                                        className="px-2 py-1 border rounded-md text-sm"
                                      />
                                      <button
                                        onClick={() => handleUpdateProductionDate(
                                          order.id,
                                          editingProductionDate.date
                                        )}
                                        className="px-2 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingProductionDate(null)}
                                        className="px-2 py-1 text-sm border rounded-md hover:bg-gray-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">
                                        {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'Not set'}
                                      </span>
                                      <button
                                        onClick={() => setEditingProductionDate({
                                          orderId: order.id,
                                          date: order.completedAt?.split('T')[0] || new Date().toISOString().split('T')[0]
                                        })}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                        title="Edit production date"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleDownloadExcel(order)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                                >
                                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                                  Excel
                                </button>
                                <button
                                  onClick={() => handleDownloadPDF(order)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600"
                                >
                                  <FileDown className="w-4 h-4 mr-1" />
                                  PDF
                                </button>
                                <button
                                  onClick={() => setReopeningOrder(order.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600"
                                >
                                  <ChevronLeft className="w-4 h-4 mr-1" />
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
              </div>
            );
          })}
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