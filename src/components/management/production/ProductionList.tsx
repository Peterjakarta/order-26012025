import React, { useState, useEffect } from 'react';
import { Calendar, FileDown, CheckCircle2, Edit2, X, ChevronDown, ChevronRight, ClipboardCheck, FileSpreadsheet, AlertCircle, Eye } from 'lucide-react';
import type { Order, Product } from '../../../types/types';
import { useBranches } from '../../../hooks/useBranches';
import { useStore } from '../../../store/StoreContext';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';
import { getBranchStyles } from '../../../utils/branchStyles';
import { generateOrderPDF, generateProductionChecklistPDF, generateOrderWithRecipesPDF } from '../../../utils/pdfGenerator';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import OrderCompletion from '../order/OrderCompletion';
import Beaker from '../../common/BeakerIcon';
import RDProductDetailsPopup from './RDProductDetailsPopup';

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
    rejectNotes: Record<string, string>,
    completionDate?: string
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
  const [viewingRDProduct, setViewingRDProduct] = useState<any>(null);
  const [processedOrderIds, setProcessedOrderIds] = useState<Set<string>>(new Set());

  // Separate orders into regular orders and R&D products
  const regularOrders = orders.filter(order => !order.isRDProduct);
  const rdProducts = orders.filter(order => {
    // Only include each R&D product once (avoid duplicates)
    if (order.isRDProduct && !processedOrderIds.has(order.id)) {
      setProcessedOrderIds(prevIds => new Set([...prevIds, order.id]));
      return true;
    }
    return false;
  });
  
  // Reset the processed IDs when orders change
  useEffect(() => {
    setProcessedOrderIds(new Set());
  }, [orders]);
  
  const scheduledOrders = regularOrders.filter(order => order.productionStartDate && order.productionEndDate);
  const unscheduledOrders = regularOrders.filter(order => !order.productionStartDate || !order.productionEndDate);

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
    orderId: string,
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>,
    completionDate?: string
  ) => {
    if (!completingOrder || !onComplete) return;
    
    try {
      await onComplete(
        orderId,
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes,
        completionDate
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

  const handleDownloadExcel = (order: Order) => {
    try {
      // Prepare data for Excel
      const data = [
        ['Production Order Details'],
        ['Order #:', order.id.slice(0, 8)],
        ['Branch:', branches.find(b => b.id === order.branchId)?.name || 'Unknown'],
        ['Order Date:', new Date(order.orderDate).toLocaleDateString()],
        ['Production Date:', order.productionStartDate || ''],
        [''],
        ['Products'],
        ['Product', 'Quantity', 'Unit', 'Mould Info']
      ];

      // Add product rows
      order.products.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const mouldInfo = calculateMouldCount(product.category, item.quantity);
        data.push([
          product.name,
          item.quantity.toString(),
          product.unit || '',
          mouldInfo || '-'
        ]);
      });

      // Add notes if present
      if (order.notes) {
        data.push([''], ['Notes:', order.notes]);
      }

      const wb = generateExcelData(data, 'Production Order');
      saveWorkbook(wb, `production-order-${order.id.slice(0, 8)}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file');
    }
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

  const handleViewRDProductDetails = (product: any) => {
    setViewingRDProduct(product);
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

      {/* R&D Products Section - Shows at top of the list for visibility */}
      {rdProducts.length > 0 && (
        <div className="p-6 bg-cyan-50 rounded-lg border border-cyan-200">
          <h3 className="font-medium text-lg mb-4 text-cyan-800 flex items-center gap-2">
            <Beaker className="w-5 h-5" />
            R&D Products in Production Pipeline
          </h3>
          <div className="divide-y divide-cyan-200">
            {rdProducts.map(order => {
              const rdProductData = order.rdProductData;
              if (!rdProductData) return null;
              
              const isExpanded = expandedOrders.has(order.id);
              
              return (
                <div key={order.id} className="py-4">
                  <div className="flex justify-between items-start">
                    <button
                      onClick={() => toggleOrderExpanded(order.id)}
                      className="flex items-center gap-3 hover:bg-cyan-100/50 p-2 rounded-md -ml-2 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-cyan-700" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-cyan-700" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-cyan-900">{rdProductData.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-200 text-cyan-800 font-medium">
                            {rdProductData.status}
                          </span>
                        </div>
                        <p className="text-sm text-cyan-700">
                          Target: {new Date(rdProductData.targetProductionDate || '').toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewRDProductDetails(rdProductData);
                        }}
                        className="px-3 py-1.5 text-sm bg-white text-cyan-700 border border-cyan-300 rounded-md hover:bg-cyan-50 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="ml-8 mt-3 bg-white p-4 rounded-lg border border-cyan-200">
                      <p className="text-sm text-gray-700">{rdProductData.description}</p>
                      {rdProductData.notes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                          <div className="font-medium mb-1">Development Notes:</div>
                          <p>{rdProductData.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                          min={dates?.start || ''}
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
                <div key={order.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => toggleOrderExpanded(order.id)}
                        className="flex items-center gap-3 hover:bg-white/50 p-2 rounded-md transition-colors"
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

                      {/* Production Dates */}
                      <div className="flex items-center gap-2">
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
                                  min={dates?.start || ''}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingDates(null)}
                                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSchedule(order.id)}
                                disabled={!dates?.start || !dates?.end}
                                className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
                              >
                                <Calendar className="w-4 h-4" />
                                Update Schedule
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-600">
                              <div>
                                Production: {new Date(order.productionStartDate!).toLocaleDateString()} 
                                {' - '} 
                                {new Date(order.productionEndDate!).toLocaleDateString()}
                              </div>
                              <div>
                                Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditDates(order)}
                              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
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
                        onClick={() => handleDownloadChecklist(order)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-pink-500 text-white rounded-md hover:bg-pink-600"
                      >
                        <ClipboardCheck className="w-4 h-4 mr-1" />
                        List
                      </button>
                      <button
                        onClick={() => handleDownloadRecipes(order)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-violet-500 text-white rounded-md hover:bg-violet-600"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Recipe
                      </button>
                      <button
                        onClick={() => setCompletingOrder(order)}
                        className="inline-flex items-center px-3 py-1.5 text-sm bg-cyan-500 text-white rounded-md hover:bg-cyan-600"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Complete
                      </button>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(order.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Products */}
                  {isExpanded && (
                    <div className="mt-4 space-y-2">
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
                    </div>
                  )}
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

      {/* RD Product Details Dialog */}
      {viewingRDProduct && (
        <RDProductDetailsPopup
          product={viewingRDProduct}
          onClose={() => setViewingRDProduct(null)}
        />
      )}
    </div>
  );
}