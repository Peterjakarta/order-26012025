import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, FileSpreadsheet, Calculator, Package2, History, AlertCircle, FileDown, ChevronDown, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { useStore } from '../../store/StoreContext';
import { useBranches } from '../../hooks/useBranches';
import OrderItem from './order/OrderItem';
import { generateOrderExcel, saveWorkbook } from '../../utils/excelGenerator';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import ConfirmDialog from '../common/ConfirmDialog';
import IngredientUsageCalculator from './order/IngredientUsageCalculator';
import { useLocation } from 'react-router-dom';

export default function CompletedOrders() {
  const { orders, removeOrder, updateOrderStatus, refreshOrders } = useOrders();
  const { products, recipes, ingredients, stockLevels, updateStockLevel, stockHistory, refreshStockHistory } = useStore();
  const { branches } = useBranches();
  const location = useLocation();
  const [poNumber, setPoNumber] = useState<string>('');
  const [reopeningOrder, setReopeningOrder] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showIngredientCalculator, setShowIngredientCalculator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingStockReduction, setLoadingStockReduction] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Create a lookup map of order IDs that have been reduced
  const stockReductionHistory = React.useMemo(() => {
    // Group by orderId and find the latest entry for each order
    const latestEntries: Record<string, { type: 'reduced' | 'reverted', timestamp: string }> = {};
    
    // Process all entries to find the latest for each order
    stockHistory.forEach(entry => {
      if (!entry.orderId) return;
      
      // Only consider reduction or reversion entries
      if (entry.changeType !== 'reduction' && entry.changeType !== 'reversion') return;
      
      const existingEntry = latestEntries[entry.orderId];
      if (!existingEntry || new Date(entry.timestamp) > new Date(existingEntry.timestamp)) {
        latestEntries[entry.orderId] = {
          type: entry.changeType === 'reduction' ? 'reduced' : 'reverted',
          timestamp: entry.timestamp
        };
      }
    });
    
    // Convert to simple map of orderId -> state
    const result: Record<string, 'reduced' | 'reverted'> = {};
    Object.entries(latestEntries).forEach(([orderId, entry]) => {
      result[orderId] = entry.type;
    });
    
    return result;
  }, [stockHistory]);

  // Refresh orders and stock history when navigating to this page
  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      await refreshOrders();
      await refreshStockHistory();
      setIsRefreshing(false);
    };
    
    refreshData();
  }, [refreshOrders, refreshStockHistory, location.pathname]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await refreshOrders();
      await refreshStockHistory();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Add a small delay for better UX feedback
    }
  };

  const handleReduceStock = async (order: Order) => {
    try {
      setError(null);
      setSuccess(null);
      setLoadingStockReduction(prev => ({ ...prev, [order.id]: true }));
      
      if (!order || !order.products?.length) {
        setError('Invalid order data');
        return;
      }

      const ingredientUpdates: { ingredientId: string; newQuantity: number }[] = [];

      const invalidProducts = order.products.filter(item => {
        const recipe = recipes.find(r => r.productId === item.productId);
        return !recipe;
      });

      if (invalidProducts.length > 0) {
        const productNames = invalidProducts
          .map(item => products.find(p => p.id === item.productId)?.name || item.productId)
          .join(', ');
        setError(`Missing recipes for: ${productNames}. Stock reduction not possible.`);
        return;
      }

      for (const item of order.products) {
        const recipe = recipes.find(r => r.productId === item.productId);
        if (!recipe) continue; // Already validated above

        const producedQty = item.producedQuantity || 0;
        if (producedQty === 0) {
          const productName = products.find(p => p.id === item.productId)?.name || item.productId;
          throw new Error(`No produced quantity set for ${productName}. Please set the produced quantity before reducing stock.`);
        }
        
        // Calculate exact scale based on produced quantity
        const scale = Number(producedQty) / Number(recipe.yield);
        if (isNaN(scale) || !isFinite(scale)) {
          const productName = products.find(p => p.id === item.productId)?.name || item.productId;
          throw new Error(`Invalid recipe yield for ${productName}. Please check the recipe configuration.`);
        }

        for (const ingredient of recipe.ingredients) {
          if (!ingredient.ingredientId) {
            console.error('Invalid ingredient data:', ingredient);
            continue;
          }

          const stockData = stockLevels[ingredient.ingredientId] || { quantity: 0 };
          // Calculate exact amount needed based on recipe yield and produced quantity
          const amountToReduce = Math.ceil(Number(ingredient.amount) * scale);
          if (isNaN(amountToReduce) || !isFinite(amountToReduce)) {
            const ingredientData = ingredients.find(i => i.id === ingredient.ingredientId);
            throw new Error(`Invalid ingredient amount for ${ingredientData?.name || ingredient.ingredientId}`);
          }

          const newQuantity = Math.max(0, stockData.quantity - amountToReduce);

          // Add to updates array
          ingredientUpdates.push({
            ingredientId: ingredient.ingredientId,
            newQuantity
          });
        }
      }

      const missingIngredients = ingredientUpdates.filter(update => 
        !ingredients.find(i => i.id === update.ingredientId)
      );

      if (missingIngredients.length > 0) {
        throw new Error('Some ingredients are missing from the database');
      }

      for (const update of ingredientUpdates) {
        const stockData = stockLevels[update.ingredientId] || { quantity: 0 };
        try {
          await updateStockLevel(update.ingredientId, {
            quantity: update.newQuantity,
            minStock: stockData.minStock,
            orderId: order.id,
            changeType: 'reduction' as const
          });
        } catch (err) {
          const ingredientName = ingredients.find(i => i.id === update.ingredientId)?.name || update.ingredientId;
          throw new Error(`Failed to update stock for ${ingredientName}`);
        }
      }

      // Manually refresh stock history to update UI state
      await refreshStockHistory();

      setError(null);
      setSuccess('Stock levels have been successfully reduced');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error reducing stock:', err);
      setError(err instanceof Error ? err.message : 'Failed to reduce stock levels');
    } finally {
      setLoadingStockReduction(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleRevertStockReduction = async (order: Order) => {
    try {
      setError(null);
      setSuccess(null);
      setLoadingStockReduction(prev => ({ ...prev, [order.id]: true }));
      const ingredientUpdates: { ingredientId: string; newQuantity: number }[] = [];
      
      // Validate order exists and has products
      if (!order || !order.products?.length) {
        setError('Invalid order data');
        return;
      }

      const invalidProducts = order.products.filter(item => {
        const recipe = recipes.find(r => r.productId === item.productId);
        return !recipe;
      });

      if (invalidProducts.length > 0) {
        const productNames = invalidProducts
          .map(item => products.find(p => p.id === item.productId)?.name || item.productId)
          .join(', ');
        setError(`Missing recipes for: ${productNames}. Stock reversion not possible.`);
        return;
      }

      for (const item of order.products) {
        const recipe = recipes.find(r => r.productId === item.productId);
        if (!recipe) continue; // Already validated above

        const producedQty = item.producedQuantity || 0;
        if (producedQty === 0) {
          const productName = products.find(p => p.id === item.productId)?.name || item.productId;
          throw new Error(`No produced quantity set for ${productName}. Cannot revert stock without produced quantity.`);
        }
        
        // Calculate exact scale based on produced quantity
        const scale = Number(producedQty) / Number(recipe.yield);
        if (isNaN(scale) || !isFinite(scale)) {
          const productName = products.find(p => p.id === item.productId)?.name || item.productId;
          throw new Error(`Invalid recipe yield for ${productName}. Please check the recipe configuration.`);
        }

        for (const ingredient of recipe.ingredients) {
          if (!ingredient.ingredientId) {
            console.error('Invalid ingredient data:', ingredient);
            continue;
          }

          const stockData = stockLevels[ingredient.ingredientId] || { quantity: 0 };
          // Calculate exact amount to add based on recipe yield and produced quantity
          const amountToAdd = Math.ceil(Number(ingredient.amount) * scale);
          if (isNaN(amountToAdd) || !isFinite(amountToAdd)) {
            const ingredientData = ingredients.find(i => i.id === ingredient.ingredientId);
            throw new Error(`Invalid ingredient amount for ${ingredientData?.name || ingredient.ingredientId}`);
          }

          const newQuantity = stockData.quantity + amountToAdd;

          ingredientUpdates.push({
            ingredientId: ingredient.ingredientId,
            newQuantity
          });
        }
      }

      // Validate all ingredients exist
      const missingIngredients = ingredientUpdates.filter(update => 
        !ingredients.find(i => i.id === update.ingredientId)
      );

      if (missingIngredients.length > 0) {
        throw new Error('Some ingredients are missing from the database');
      }

      // Process all stock updates
      for (const update of ingredientUpdates) {
        const stockData = stockLevels[update.ingredientId] || { quantity: 0 };
        try {
          await updateStockLevel(update.ingredientId, {
            quantity: update.newQuantity,
            minStock: stockData.minStock,
            orderId: order.id,
            changeType: 'reversion' as const
          });
        } catch (err) {
          const ingredientName = ingredients.find(i => i.id === update.ingredientId)?.name || update.ingredientId;
          throw new Error(`Failed to update stock for ${ingredientName}`);
        }
      }

      // Manually refresh stock history to update UI state
      await refreshStockHistory();

      setSuccess('Stock levels have been successfully reverted');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

      setError(null);
    } catch (err) {
      console.error('Error reverting stock reduction:', err);
      setError(err instanceof Error ? err.message : 'Failed to revert stock levels');
    } finally {
      setLoadingStockReduction(prev => ({ ...prev, [order.id]: false }));
    }
  };
  
  // Group orders by month
  const ordersByMonth = React.useMemo(() => {
    // Filter completed orders
    const completedOrders = orders.filter(order => order.status === 'completed');
    
    // Group orders by month
    const grouped = completedOrders.reduce((acc, order) => {
      // Extract month and year from completedAt date
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
    
    // Sort the grouped orders by month (most recent first)
    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, { monthName, orders }]) => {
        // Sort orders within each month by completedAt date (newest first)
        return {
          monthKey: key,
          monthName,
          orders: orders.sort((a, b) => {
            const dateA = new Date(a.completedAt || a.updatedAt);
            const dateB = new Date(b.completedAt || b.updatedAt);
            return dateB.getTime() - dateA.getTime();
          })
        };
      });
  }, [orders]);

  // Initialize first month as expanded on initial render
  useEffect(() => {
    if (ordersByMonth.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([ordersByMonth[0].monthKey]));
    }
  }, [ordersByMonth, expandedMonths]);

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

  const selectedOrdersData = orders.filter(order => 
    selectedOrders.has(order.id)
  );
  
  // Expand all months
  const expandAllMonths = () => {
    const allMonthKeys = ordersByMonth.map(group => group.monthKey);
    setExpandedMonths(new Set(allMonthKeys));
  };
  
  // Collapse all months
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
        <div className="flex flex-col gap-2">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {selectedOrders.size > 0 && (
            <button
              onClick={() => setShowIngredientCalculator(true)}
              className="w-52 h-10 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-md hover:bg-pink-700"
            >
              <Calculator className="w-4 h-4" />
              Calculate Ingredients ({selectedOrders.size})
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-32 h-10 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={expandAllMonths}
              className="w-32 h-10 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllMonths}
              className="w-32 h-10 flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
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
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
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
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDownloadExcel(order)}
                                  className="w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                                  title="Download Excel"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  Excel
                                </button>
                                <button
                                  onClick={() => handleDownloadPDF(order)}
                                  className="w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-md hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                                  title="Download PDF"
                                >
                                  <FileDown className="w-4 h-4" />
                                  PDF
                                </button>
                                {!stockReductionHistory[order.id] || stockReductionHistory[order.id] === 'reverted' ? (
                                  <button
                                    onClick={() => handleReduceStock(order)}
                                    disabled={loadingStockReduction[order.id]}
                                    className={`w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500
                                      ${loadingStockReduction[order.id]
                                        ? 'bg-green-100 text-green-400 cursor-wait transform-none hover:shadow-none'
                                        : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
                                      }`}
                                    title="Reduce ingredient stock"
                                  >
                                    <Package2 className="w-4 h-4" />
                                    {loadingStockReduction[order.id] ? 'Reducing...' : 'Reduce Stock'}
                                  </button>
                                ) : stockReductionHistory[order.id] === 'reduced' ? (
                                  <button
                                    onClick={() => handleRevertStockReduction(order)}
                                    disabled={loadingStockReduction[order.id]}
                                    className={`w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500
                                      ${loadingStockReduction[order.id]
                                        ? 'bg-blue-100 text-blue-400 cursor-wait transform-none hover:shadow-none'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                                      }`}
                                    title="Revert stock reduction"
                                  >
                                    <History className="w-4 h-4" />
                                    {loadingStockReduction[order.id] ? 'Reverting...' : 'Revert Stock'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReduceStock(order)}
                                    disabled={loadingStockReduction[order.id]}
                                    className={`w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500
                                      ${loadingStockReduction[order.id]
                                        ? 'bg-green-100 text-green-400 cursor-wait transform-none hover:shadow-none'
                                        : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600'
                                      }`}
                                    title="Reduce ingredient stock"
                                  >
                                    <Package2 className="w-4 h-4" />
                                    {loadingStockReduction[order.id] ? 'Reducing...' : 'Reduce Stock'}
                                  </button>
                                )}
                                <button
                                  onClick={() => setReopeningOrder(order.id)}
                                  className="w-36 h-10 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
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