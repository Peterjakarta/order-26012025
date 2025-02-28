import React, { useState, useEffect } from 'react';
import { Calendar, FileDown, CheckCircle2, Edit2, X, ChevronDown, ChevronRight, ClipboardCheck, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Order } from '../../../types/types';
import { useBranches } from '../../../hooks/useBranches';
import { useStore } from '../../../store/StoreContext';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';
import { getBranchStyles } from '../../../utils/branchStyles';
import { generateOrderPDF, generateProductionChecklistPDF, generateOrderWithRecipesPDF } from '../../../utils/pdfGenerator';
import OrderCompletion from '../order/OrderCompletion';

interface ProductionListProps {
  startDate: string;
  endDate: string;
  orders: Order[];
  products: Product[];
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
  orders, 
  products,
  onSchedule,
  onComplete,
  onRemove
}: ProductionListProps) {
  const { branches } = useBranches();
  const [orderDates, setOrderDates] = useState<Record<string, { start: string; end: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [editingDates, setEditingDates] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { recipes, ingredients } = useStore();
  const [dateErrors, setDateErrors] = useState<Record<string, string>>({});

  // Separate orders into scheduled and unscheduled
  const scheduledOrders = orders.filter(order => order.productionStartDate && order.productionEndDate);
  const unscheduledOrders = orders.filter(order => !order.productionStartDate || !order.productionEndDate);

  const handleStartDateChange = (orderId: string, date: string) => {
    setDateErrors(prev => ({ ...prev, [orderId]: '' }));
    setOrderDates(prev => ({
      ...prev,
      [orderId]: {
        start: date,
        end: prev[orderId]?.end || ''
      }
    }));
  };

  const handleEndDateChange = (orderId: string, date: string) => {
    setDateErrors(prev => ({ ...prev, [orderId]: '' }));
    setOrderDates(prev => ({
      ...prev,
      [orderId]: {
        start: prev[orderId]?.start || '',
        end: date
      }
    }));
  };

  const handleSchedule = async (orderId: string) => {
    try {
      setError(null);
      setDateErrors(prev => ({ ...prev, [orderId]: '' }));
      const dates = orderDates[orderId];
      
      if (!dates?.start || !dates?.end) {
        setDateErrors(prev => ({ 
          ...prev, 
          [orderId]: 'Please select both start and end dates'
        }));
        return;
      }

      if (new Date(dates.end) < new Date(dates.start)) {
        setDateErrors(prev => ({ 
          ...prev, 
          [orderId]: 'End date cannot be before start date'
        }));
        return;
      }

      await onSchedule(orderId, dates.start, dates.end);
      
      // Clear dates after successful scheduling
      setOrderDates(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setEditingDates(null);
    } catch (err) {
      setError('Failed to schedule production');
    }
  };

  const handleEditDates = (order: Order) => {
    setEditingDates(order.id);
    setOrderDates(prev => ({
      ...prev,
      [order.id]: {
        start: order.productionStartDate!,
        end: order.productionEndDate!
      }
    }));
  };

  const handleComplete = async (
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => {
    if (!completingOrder || !onComplete) return;
    
    try {
      await onComplete(
        completingOrder.id,
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes
      );
      setCompletingOrder(null);
    } catch (err) {
      console.error('Error completing order:', err);
      throw err;
    }
  };

  const handleDownloadPDF = (order: Order) => {
    const doc = generateOrderPDF(order, products);
    doc.save(`production-${order.id.slice(0, 8)}.pdf`);
  };

  const handleDownloadChecklist = (order: Order) => {
    const doc = generateProductionChecklistPDF(order, products);
    doc.save(`production-checklist-${order.id.slice(0, 8)}.pdf`);
  };

  const handleDownloadRecipes = (order: Order) => {
    const doc = generateOrderWithRecipesPDF(order, products, recipes, ingredients);
    doc.save(`production-recipes-${order.id.slice(0, 8)}.pdf`);
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

  if (orders.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No orders selected for production
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Unscheduled Orders */}
      {unscheduledOrders.length > 0 && (
        <div className="p-6">
          <h3 className="font-medium text-lg mb-4">Unscheduled Orders</h3>
          <div className="space-y-4">
            {unscheduledOrders.map(order => {
              const branch = branches.find(b => b.id === order.branchId);
              const dates = orderDates[order.id];
              const styles = getBranchStyles(order.branchId);
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <div key={order.id} className="bg-white border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={() => toggleOrderExpanded(order.id)}
                      className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-md -ml-2 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-sm ${styles.base}`}>
                            {branch?.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 text-left">
                          <p>Ordered by: {order.orderedBy}</p>
                          <p>Order Date: {new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </button>
                    <div className="text-sm text-gray-600">
                      Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Enhanced Date Selection - Always visible */}
                  <div className="bg-gray-50 border rounded-lg p-5 mt-4">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                      Production Schedule
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={dates?.start || ''}
                          onChange={(e) => handleStartDateChange(order.id, e.target.value)}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="date"
                          value={dates?.end || ''}
                          onChange={(e) => handleEndDateChange(order.id, e.target.value)}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          min={dates?.start || new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                    </div>
                    {dateErrors[order.id] && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mt-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {dateErrors[order.id]}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end pt-4 mt-2">
                      <button
                        onClick={() => handleSchedule(order.id)}
                        disabled={!dates?.start || !dates?.end}
                        className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 
                          text-white rounded-md hover:from-pink-700 hover:to-purple-700 transition-all duration-300 
                          hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 
                          disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule Production
                      </button>
                    </div>
                  </div>

                  {/* Products */}
                  {isExpanded && <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 mb-2">Products:</h4>
                    {order.products.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;

                      const mouldInfo = calculateMouldCount(product.category, item.quantity);
                      const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);

                      return (
                        <div key={item.productId} className="flex justify-between items-center text-sm bg-white p-3 rounded-md border">
                          <span className="font-medium">{product.name}</span>
                          <div className="flex items-center gap-4">
                            <span>
                              {item.quantity} {product.unit}
                            </span>
                            {showMould && (
                              <span className={`${
                                isBonBonCategory(product.category) ? 'text-pink-600' : 'text-blue-600'
                              } font-medium`}>
                                {mouldInfo}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Orders */}
      {scheduledOrders.length > 0 && (
        <div className="p-6">
          <h3 className="font-medium text-lg mb-4">Scheduled Orders</h3>
          <div className="space-y-4">
            {scheduledOrders.map(order => {
              const branch = branches.find(b => b.id === order.branchId);
              const isEditing = editingDates === order.id;
              const dates = orderDates[order.id];
              const styles = getBranchStyles(order.branchId);
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <div key={order.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={() => toggleOrderExpanded(order.id)}
                      className="flex items-center gap-3 hover:bg-white/50 p-2 rounded-md -ml-2 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-sm ${styles.base}`}>
                            {branch?.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 text-left">
                          <p>Ordered by: {order.orderedBy}</p>
                          <p>Order Date: {new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-4">
                      {onRemove && (
                        <button
                          onClick={() => onRemove(order.id)}
                          className="w-40 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-md hover:from-red-600 hover:to-rose-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          Remove from Production
                        </button>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDownloadExcel(order)}
                          className="w-36 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(order)}
                          className="w-36 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </button>
                        <button
                          onClick={() => handleDownloadChecklist(order)}
                          className="w-36 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-md hover:from-pink-600 hover:to-rose-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          Checklist
                        </button>
                        <button
                          onClick={() => handleDownloadRecipes(order)}
                          className="w-36 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-md hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          <FileDown className="w-4 h-4" />
                          Recipes
                        </button>
                        <button
                          onClick={() => setCompletingOrder(order)}
                          className="w-40 h-12 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-md hover:from-cyan-600 hover:to-teal-600 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete Order
                        </button>
                      </div>
                      <div className="text-sm">
                        {isEditing ? (
                          <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={dates?.start || ''}
                                  onChange={(e) => handleStartDateChange(order.id, e.target.value)}
                                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={dates?.end || ''}
                                  onChange={(e) => handleEndDateChange(order.id, e.target.value)}
                                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                  min={dates?.start || new Date().toISOString().split('T')[0]}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingDates(null)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSchedule(order.id)}
                                disabled={!dates?.start || !dates?.end}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
                              >
                                <Calendar className="w-4 h-4" />
                                Update Schedule
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-gray-600">
                                Production: {new Date(order.productionStartDate!).toLocaleDateString()} 
                                {' - '} 
                                {new Date(order.productionEndDate!).toLocaleDateString()}
                              </div>
                              <div className="text-gray-600">
                                Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditDates(order)}
                              className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Dates
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  {isExpanded && <div className="space-y-2">
                    {order.products.map(item => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;

                      const mouldInfo = calculateMouldCount(product.category, item.quantity);
                      const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);

                      return (
                        <div key={item.productId} className="flex justify-between items-center text-sm">
                          <span>{product.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">
                              {item.quantity} {product.unit}
                            </span>
                            {showMould && (
                              <span className={`${
                                isBonBonCategory(product.category) ? 'text-pink-600' : 'text-blue-600'
                              } font-medium`}>
                                {mouldInfo}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Completion Dialog */}
      {completingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <OrderCompletion
              order={completingOrder}
              onComplete={handleComplete}
              onClose={() => setCompletingOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}