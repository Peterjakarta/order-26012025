import React, { useState, useEffect } from 'react';
import { Package2, AlertCircle, Calendar, FileDown, RefreshCw, ChevronDown, ChevronRight, Beaker } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useBranches } from '../../hooks/useBranches';
import OrderItem from './order/OrderItem';
import { useOrderActions } from '../../hooks/useOrderActions';
import { generateOrderExcel, saveWorkbook } from '../../utils/excelGenerator';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import { getBranchStyles } from '../../utils/branchStyles';

export default function OrderList() {
  const { orders, loading, error, removeOrder, updateOrderStatus, refreshOrders } = useOrders();
  const { branches } = useBranches();
  const { downloadPDF } = useOrderActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Reset selected orders when orders change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [orders]);

  // Refresh orders when navigating to this page
  useEffect(() => {
    const refresh = async () => {
      setIsRefreshing(true);
      await refreshOrders();
      setIsRefreshing(false);
    };
    
    refresh();
  }, [refreshOrders, location.pathname]);
  
  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter out completed orders and sort by order date
  const pendingOrders = orders
    .filter(order => order.status !== 'completed')
    .sort((a, b) => {
      // Sort by updatedAt timestamp for most recent changes
      const timeA = new Date(b.updatedAt).getTime();
      const timeB = new Date(a.updatedAt).getTime();
      return timeA - timeB;
    });

  const handleUpdateStatus = async (
    orderId: string, 
    status: Order['status'], 
    producedQuantities?: Record<string, number>
  ) => {
    try {
      await updateOrderStatus(orderId, status, producedQuantities);
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

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
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
      const wb = generateOrderExcel(order, orders);
      saveWorkbook(wb, `order-${order.id.slice(0, 8)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
    }
  };

  const handleDownloadPDF = (order: Order) => {
    try {
      const doc = generateOrderPDF(order, orders);
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

      {pendingOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No active orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingOrders.map(order => {
            const branch = branches.find(b => b.id === order.branchId);
            const branchStyles = getBranchStyles(order.branchId);
            const isExpanded = expandedOrders.has(order.id);
            
            return (
              <div key={order.id} className="relative">
                {/* Add an R&D indicator if this is an R&D product */}
                {order.isRDProduct && (
                  <div className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 z-10">
                    <div className="bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Beaker className="w-3.5 h-3.5" />
                      <span>R&D</span>
                    </div>
                  </div>
                )}
                
                <div className="pl-4">
                  <div className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-200 ${
                    selectedOrders.has(order.id) ? 'ring-2 ring-pink-500' : ''
                  }`}>
                    {/* Collapsible Header */}
                    <div 
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleOrderExpanded(order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <div className={`px-3 py-1 rounded-lg ${branchStyles.base}`}>
                            {order.branchId}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Order #{order.id.slice(0, 8)}
                              {order.poNumber && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  PO: {order.poNumber}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span>Ordered: {new Date(order.orderDate).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>By: {order.orderedBy}</span>
                              {order.isRDProduct && (
                                <>
                                  <span>•</span>
                                  <span className="text-cyan-600 font-medium flex items-center gap-1">
                                    <Beaker className="w-3.5 h-3.5" />
                                    R&D Test Product
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                      </div>
                    </div>

                    {/* Content */}
                    {isExpanded && (
                      <div className="p-4 border-t">
                        <OrderItem 
                          order={order} 
                          onRemove={() => removeOrder(order.id)}
                          onUpdateStatus={handleUpdateStatus}
                          onDownloadExcel={handleDownloadExcel}
                          onDownloadPDF={handleDownloadPDF}
                          extraActions={
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
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}