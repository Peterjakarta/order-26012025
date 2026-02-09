import React, { useState, useEffect } from 'react';
import { Package2, AlertCircle, Calendar, FileDown, RefreshCw, Beaker } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useBranches } from '../../hooks/useBranches';
import { useStore } from '../../store/StoreContext';
import OrderItem from './order/OrderItem';
import { useOrderActions } from '../../hooks/useOrderActions';
import { generateOrderExcel, saveWorkbook } from '../../utils/excelGenerator';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import { getBranchStyles } from '../../utils/branchStyles';
import RDProductionView from './production/RDProductionView';
import RDProductDetailsPopup from './production/RDProductDetailsPopup';

export default function OrderList() {
  const { orders, loading, error, removeOrder, updateOrderStatus, refreshOrders } = useOrders();
  const { branches } = useBranches();
  const { products } = useStore();
  const { downloadPDF } = useOrderActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingRDProduct, setViewingRDProduct] = useState<any>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize data on first mount
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

  // Reset selected orders when orders change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [orders]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Separate R&D orders and regular orders
  const rdOrders = orders.filter(order => order.isRDProduct && order.status !== 'completed');
  const regularOrders = orders.filter(order => !order.isRDProduct && order.status !== 'completed');

  // Filter out completed orders and sort by order date
  const pendingOrders = regularOrders
    .sort((a, b) => {
      // Sort by updatedAt timestamp for most recent changes
      const timeA = new Date(b.updatedAt).getTime();
      const timeB = new Date(a.updatedAt).getTime();
      return timeA - timeB;
    });

  const handleUpdateStatus = async (
    orderId: string, 
    status: Order['status'], 
    producedQuantities?: Record<string, number>,
    stockQuantities?: Record<string, number>,
    rejectQuantities?: Record<string, number>,
    rejectNotes?: Record<string, string>,
    completionDate?: string
  ) => {
    try {
      await updateOrderStatus(orderId, status, producedQuantities, stockQuantities, rejectQuantities, rejectNotes, undefined, completionDate);
    } catch (err) {
      console.error('Error updating order status:', err);
      // Let the error be handled by the useOrders hook
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

  const handleDownloadExcel = (order: Order) => {
    try {
      const wb = generateOrderExcel(order, products);
      saveWorkbook(wb, `order-${order.id.slice(0, 8)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
    }
  };

  const handleDownloadPDF = (order: Order) => {
    try {
      const doc = generateOrderPDF(order, products);
      doc.save(`order-${order.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleScheduleProduction = (orderId: string) => {
    navigate(`/management/production/${orderId}`);
  };

  const handlePlanProduction = () => {
    if (selectedOrders.size === 0) return;
    navigate(`/management/production/${Array.from(selectedOrders).join(',')}`);
  };
  
  const handleViewRDProduct = (order: Order) => {
    setViewingRDProduct(order.rdProductData);
  };
  
  const handleReopenOrder = async (orderId: string) => {
    try {
      // Update order status to pending
      await updateOrderStatus(orderId, 'pending');
      
      // Navigate to the order form page with the order ID
      navigate(`/?orderId=${orderId}`);
    } catch (err) {
      console.error('Error reopening order:', err);
    }
  };

  if (loading && !isRefreshing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
        <button 
          onClick={refreshOrders}
          className="ml-4 px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Active Orders</h2>
          {isRefreshing && (
            <span className="text-sm text-gray-500 flex items-center ml-2">
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              Refreshing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-36 h-10 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {selectedOrders.size > 0 && (
            <button
              onClick={handlePlanProduction}
              className="w-40 h-10 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-md hover:from-pink-700 hover:to-purple-700 transition-all duration-300 hover:shadow-glass hover:scale-[1.02] active:scale-[0.98]"
            >
              <Calendar className="w-4 h-4" />
              Plan ({selectedOrders.size})
            </button>
          )}
        </div>
      </div>

      {/* R&D Product Orders Section */}
      {rdOrders.length > 0 && (
        <RDProductionView 
          rdOrders={rdOrders}
          onRefresh={refreshOrders}
        />
      )}

      {pendingOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No active orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingOrders.map(order => {
            const branch = branches.find(b => b.id === order.branchId);
            const branchStyles = getBranchStyles(order.branchId);
            
            return (
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
                    onReopen={() => handleReopenOrder(order.id)}
                    selected={selectedOrders.has(order.id)}
                    extraActions={(order) => (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-sm ${branchStyles.base}`}>
                          {branch?.name}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadExcel(order);
                            }}
                            className="w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <FileDown className="w-4 h-4" />
                            Excel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(order);
                            }}
                            className="w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <FileDown className="w-4 h-4" />
                            PDF
                          </button>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingRDProduct && (
        <RDProductDetailsPopup
          product={viewingRDProduct}
          onClose={() => setViewingRDProduct(null)}
        />
      )}
    </div>
  );
}