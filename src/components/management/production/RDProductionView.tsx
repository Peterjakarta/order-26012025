import React, { useState } from 'react';
import { Beaker, Eye, Calendar, FileDown, Edit2, Trash2, ChevronRight, ChevronDown, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Order } from '../../../types/types';
import RDProductDetailsPopup from './RDProductDetailsPopup';
import { useOrders } from '../../../hooks/useOrders';
import { getBranchStyles } from '../../../utils/branchStyles';
import { generateOrderExcel, saveWorkbook } from '../../../utils/excelGenerator';
import { generateOrderPDF } from '../../../utils/pdfGenerator';
import OrderCompletion from '../order/OrderCompletion';
import { useNavigate } from 'react-router-dom';

interface RDProductionViewProps {
  rdOrders: Order[];
  onRefresh: () => void;
}

export default function RDProductionView({ rdOrders, onRefresh }: RDProductionViewProps) {
  const { updateOrderStatus, removeOrder, updateOrderProduction } = useOrders();
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const navigate = useNavigate();

  const toggleExpanded = (orderId: string) => {
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

  const handleViewDetails = (order: Order) => {
    setViewingProduct(order.rdProductData);
  };

  const handlePlanProduction = (order: Order) => {
    navigate(`/management/production/${order.id}`);
  };

  const handleComplete = async (
    producedQuantities: Record<string, number>,
    stockQuantities: Record<string, number>,
    rejectQuantities: Record<string, number>,
    rejectNotes: Record<string, string>
  ) => {
    if (!completingOrder) return;
    
    try {
      await updateOrderStatus(
        completingOrder.id,
        'completed',
        producedQuantities,
        stockQuantities,
        rejectQuantities,
        rejectNotes
      );
      setCompletingOrder(null);
      onRefresh();
    } catch (error) {
      console.error('Error completing RD order:', error);
      throw error;
    }
  };

  const handleReopenOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'processing');
      onRefresh();
    } catch (error) {
      console.error('Error reopening order:', error);
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to remove this R&D product from the production system?')) {
      try {
        await removeOrder(orderId);
        onRefresh();
      } catch (error) {
        console.error('Error removing RD order:', error);
      }
    }
  };

  const handleDownloadExcel = (order: Order) => {
    try {
      const wb = generateOrderExcel(order, []);
      saveWorkbook(wb, `rd-production-${order.id.slice(0, 8)}.xlsx`);
    } catch (error) {
      console.error('Error generating Excel:', error);
    }
  };

  const handleDownloadPDF = (order: Order) => {
    try {
      const doc = generateOrderPDF(order, []);
      doc.save(`rd-production-${order.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (rdOrders.length === 0) {
    return null;
  }

  return (
    <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200 mb-6">
      <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-cyan-800">
        <Beaker className="w-5 h-5" />
        R&D Products in Production Pipeline
      </h3>

      <div className="space-y-3">
        {rdOrders.map(order => {
          const isExpanded = expandedOrders.has(order.id);
          const styles = getBranchStyles(order.branchId);
          
          return (
            <div 
              key={order.id}
              className="bg-white rounded-lg border border-cyan-100 overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div 
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => toggleExpanded(order.id)}
                >
                  <div className="flex items-start gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-cyan-600 mt-1" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-cyan-600 mt-1" />
                    )}
                    <div>
                      <h4 className="font-medium text-cyan-900">
                        {order.rdProductData?.name || "R&D Product"}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
                          {order.rdProductData?.status || "development"}
                        </span>
                        <span className="text-sm text-cyan-700 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Target: {new Date(order.deliveryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-cyan-100">
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><span className="font-medium">Start Date:</span> {new Date(order.productionStartDate || order.orderDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Target Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}</p>
                      {order.notes && (
                        <div>
                          <p className="font-medium">Notes:</p>
                          <p className="whitespace-pre-line">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons - Same as regular orders */}
                <div className="mt-4 pt-4 border-t border-cyan-100 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-700 rounded-md hover:bg-cyan-200 flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View R&D Details
                  </button>
                  
                  <button
                    onClick={() => handlePlanProduction(order)}
                    className="px-3 py-1.5 text-sm bg-pink-100 text-pink-700 rounded-md hover:bg-pink-200 flex items-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    Plan Production
                  </button>
                  
                  <button
                    onClick={() => setCompletingOrder(order)}
                    className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </button>
                  
                  <button
                    onClick={() => handleDownloadExcel(order)}
                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 flex items-center gap-1"
                  >
                    <FileDown className="w-4 h-4" />
                    Excel
                  </button>
                  
                  <button
                    onClick={() => handleDownloadPDF(order)}
                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 flex items-center gap-1"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>
                  
                  {order.status === 'completed' ? (
                    <button
                      onClick={() => handleReopenOrder(order.id)}
                      className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Reopen
                    </button>
                  ) : null}
                  
                  <button
                    onClick={() => handleRemoveOrder(order.id)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {viewingProduct && (
        <RDProductDetailsPopup
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
        />
      )}

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