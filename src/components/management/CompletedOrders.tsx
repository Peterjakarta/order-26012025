import React, { useState } from 'react';
import { CheckCircle2, FileDown, RotateCcw, FileSpreadsheet, Calculator, Package2, History } from 'lucide-react';
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
  const { products, recipes, ingredients, stockLevels, updateStockLevel, stockHistory } = useStore();
  const { branches } = useBranches();
  const [poNumber, setPoNumber] = useState<string>('');
  const [reopeningOrder, setReopeningOrder] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showIngredientCalculator, setShowIngredientCalculator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingStockReduction, setLoadingStockReduction] = useState<Record<string, boolean>>({});
  
  // Create a lookup map of order IDs that have been reduced
  const stockReductionHistory = React.useMemo(() => {
    return stockHistory.reduce((acc, entry) => {
      if (entry.orderId && entry.changeType === 'reduction') {
        acc[entry.orderId] = true;
      }
      return acc;
    }, {} as Record<string, boolean>);
  }, [stockHistory]);

  const handleReduceStock = async (order: Order) => {
    try {
      setError(null);
      setSuccess(null);
      setLoadingStockReduction(prev => ({ ...prev, [order.id]: true }));
      
      // Validate order exists and has products
      if (!order || !order.products?.length) {
        setError('Invalid order data');
        return;
      }

      // Validate all ingredients exist before starting any updates
      const ingredientUpdates: { ingredientId: string; newQuantity: number }[] = [];

      // Validate order has products and recipes exist
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

      // Calculate ingredient usage for each product
      for (const item of order.products) {
        const recipe = recipes.find(r => r.productId === item.productId);
        if (!recipe) continue; // Already validated above

        // Calculate scaling factor based on produced quantity and round up
        const scale = Math.ceil((item.producedQuantity || item.quantity) / recipe.yield);

        // Calculate stock reduction for each ingredient
        for (const ingredient of recipe.ingredients) {
          // Validate ingredient exists
          if (!ingredient.ingredientId) {
            console.error('Invalid ingredient data:', ingredient);
            continue;
          }

          const stockData = stockLevels[ingredient.ingredientId] || { quantity: 0 };
          const amountToReduce = Math.ceil(ingredient.amount * scale); // Round up to whole number
          const newQuantity = Math.max(0, stockData.quantity - amountToReduce);

          // Add to updates array
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
            changeType: 'reduction' as const
          });
        } catch (err) {
          const ingredientName = ingredients.find(i => i.id === update.ingredientId)?.name || update.ingredientId;
          throw new Error(`Failed to update stock for ${ingredientName}`);
        }
      }

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

      // Validate order has products and recipes exist
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

      // Calculate ingredient usage for each product
      for (const item of order.products) {
        const recipe = recipes.find(r => r.productId === item.productId);
        if (!recipe) continue; // Already validated above

        // Calculate scaling factor based on produced quantity
        const scale = (item.producedQuantity || item.quantity) / recipe.yield;

        // Add back stock for each ingredient
        for (const ingredient of recipe.ingredients) {
          // Validate ingredient exists
          if (!ingredient.ingredientId) {
            console.error('Invalid ingredient data:', ingredient);
            continue;
          }

          const stockData = stockLevels[ingredient.ingredientId] || { quantity: 0 };
          const amountToAdd = Math.ceil(ingredient.amount * scale); // Round up to whole number
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
                      {!stockReductionHistory[order.id] ? (
                        <button
                          onClick={() => handleReduceStock(order)}
                          disabled={loadingStockReduction[order.id]}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                            ${loadingStockReduction[order.id]
                              ? 'bg-green-100 text-green-400 cursor-wait'
                              : 'text-green-600 hover:bg-green-50'
                            }`}
                          title="Reduce ingredient stock"
                        >
                          <Package2 className="w-4 h-4" />
                          {loadingStockReduction[order.id] ? 'Reducing...' : 'Reduce Stock'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevertStockReduction(order)}
                          disabled={loadingStockReduction[order.id]}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors
                            ${loadingStockReduction[order.id]
                              ? 'bg-blue-100 text-blue-400 cursor-wait'
                              : 'text-blue-600 hover:bg-blue-50'
                            }`}
                          title="Revert stock reduction"
                        >
                          <History className="w-4 h-4" />
                          {loadingStockReduction[order.id] ? 'Reverting...' : 'Revert Stock'}
                        </button>
                      )}
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