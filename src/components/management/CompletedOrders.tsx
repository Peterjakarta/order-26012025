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
  AlertCircle,
  Scale,
  ClipboardList,
  Upload,
  FileText,
  Printer,
  Mail
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
  const { orders, removeOrder, updateOrderStatus, refreshOrders, updateStockReduction } = useOrders();
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
    try {
      const wb = generateOrderExcel(order, products, poNumber);
      saveWorkbook(wb, `order-${order.orderNumber || order.id.slice(0, 8)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file');
    }
  };

  const handleDownloadPDF = (order: Order) => {
    try {
      const doc = generateOrderPDF(order, products, poNumber);
      doc.save(`order-${order.orderNumber || order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF file');
    }
  };

  const handleReopenOrder = async (order: Order) => {
    try {
      setError(null);
      await updateOrderStatus(order.id, 'pending');
      setReopeningOrder(null);
      setSuccess('Order reopened successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error reopening order:', err);
      setError('Failed to reopen order');
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

  const handleToggleStockReduction = async (orderId: string, isReduced: boolean) => {
    try {
      setError(null);
      await updateStockReduction(orderId, !isReduced);
      setSuccess(isReduced ? 'Stock reverted successfully' : 'Stock reduced successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error toggling stock reduction:', err);
      setError('Failed to update stock');
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

  const extraActions = (order: Order) => (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2 mr-4">
        <span className="text-sm text-gray-600">Production Date:</span>
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
              onClick={() => handleUpdateProductionDate(order.id, editingProductionDate.date)}
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
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-6 border">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Date Range</h3>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-1.5 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-gray-700">PO Number</h3>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter PO number"
              className="w-full px-3 py-1.5 border rounded-md text-sm"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateReport}
                disabled={!startDate || !endDate}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                Generate Report
              </button>
              {selectedOrders.size > 0 && (
                <button
                  onClick={() => setShowIngredientCalculator(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Calculator className="w-4 h-4" />
                  Calculate ({selectedOrders.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5" />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-2">
        {ordersByMonth.map(monthGroup => {
          const isExpanded = expandedCategory === monthGroup.monthKey;
          
          return (
            <div key={monthGroup.monthKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : monthGroup.monthKey)}
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
                <div className="border-t">
                  {monthGroup.orders.map(order => (
                    <div key={order.id} className="relative">
                      <div className="absolute left-4 top-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(order.id);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                      </div>
                      <div className="pl-12">
                        <OrderItem 
                          order={order} 
                          onRemove={() => removeOrder(order.id)}
                          onUpdateStatus={handleUpdateStatus}
                          onDownloadExcel={handleDownloadExcel}
                          onDownloadPDF={handleDownloadPDF}
                          onReopen={() => setReopeningOrder(order.id)}
                          selected={selectedOrders.has(order.id)}
                          onToggleStock={handleToggleStockReduction}
                          extraActions={extraActions}
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