import React, { useState, useEffect } from 'react';
import { Package2, AlertCircle, Calendar, FileDown, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrders } from '../../hooks/useOrders';
import { useBranches } from '../../hooks/useBranches';
import OrderItem from './order/OrderItem';
import { useOrderActions } from '../../hooks/useOrderActions';

export default function OrderList() {
  const { orders, loading, error, removeOrder, updateOrderStatus, refreshOrders } = useOrders();
  const { branches } = useBranches();
  const { downloadPDF } = useOrderActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const getBranchStyles = (branchId: string) => {
    switch (branchId) {
      case 'seseduh':
        return 'bg-blue-100 text-blue-800';
      case '2go':
        return 'bg-green-100 text-green-800';
      case 'external':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {selectedOrders.size > 0 && (
            <button
              onClick={handlePlanProduction}
              className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-md hover:from-pink-700 hover:to-purple-700 transition-all duration-300 hover:shadow-glass hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
            >
              <Calendar className="w-4 h-4" />
              Plan Production ({selectedOrders.size})
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
            
            return (
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
                    onScheduleProduction={handleScheduleProduction}
                    selected={selectedOrders.has(order.id)}
                    extraActions={
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-sm ${branchStyles}`}>
                            {branch?.name} • {new Date(order.orderDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          {order.poNumber && (
                            <span className="text-sm text-gray-500">
                              PO: {order.poNumber}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => downloadPDF(order)}
                          className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-200 rounded-md hover:bg-gray-50/80 transition-all duration-300 hover:shadow-soft hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm bg-white/50"
                          title="Download PDF"
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}