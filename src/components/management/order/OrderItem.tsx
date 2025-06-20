import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, FileSpreadsheet, Scale, ChevronLeft, Trash2, Eye } from 'lucide-react';
import type { Order } from '../../../types/types';
import OrderDetails from './OrderDetails';
import OrderProducts from './OrderProducts';
import OrderStatus from './OrderStatus';
import { getBranchStyles } from '../../../utils/branchStyles';

interface OrderItemProps {
  order: Order;
  onRemove: () => void;
  onUpdateStatus: (orderId: string, status: Order['status'], producedQuantities?: Record<string, number>) => Promise<void>;
  onToggleStock?: (orderId: string, isReduced: boolean) => Promise<void>;
  selected?: boolean;
  onSelect?: () => void;
  extraActions?: (order: Order) => React.ReactNode;
  onDownloadExcel?: (order: Order) => void;
  onDownloadPDF?: (order: Order) => void;
  onReopen?: (order: Order) => void;
  onViewDetails?: (order: Order) => void;
}

export default function OrderItem({ 
  order, 
  onRemove,
  onUpdateStatus,
  onToggleStock,
  selected,
  onSelect,
  extraActions,
  onDownloadExcel,
  onDownloadPDF,
  onReopen,
  onViewDetails
}: OrderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = getBranchStyles(order.branchId);

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Only toggle if clicking the header area, not buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-200 ${
      selected ? 'ring-2 ring-pink-500' : ''
    }`}>
      {/* Collapsible Header */}
      <div 
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <div className={`px-3 py-1 rounded-lg ${styles.base}`}>
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
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleStock && (
              <button
                onClick={(e) => handleButtonClick(e, () => onToggleStock(order.id, order.stockReduced || false))}
                className={`btn-primary flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  order.stockReduced
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                } text-white`}
              >
                <Scale className="w-4 h-4" />
                {order.stockReduced ? 'Revert Stock' : 'Reduce Stock'}
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleButtonClick(e, () => onViewDetails?.(order))}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="View order details"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => handleButtonClick(e, () => onDownloadExcel?.(order))}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>

              <button
                onClick={(e) => handleButtonClick(e, () => onDownloadPDF?.(order))}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>

              <button
                onClick={(e) => handleButtonClick(e, () => onReopen?.(order))}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-md"
              >
                <ChevronLeft className="w-4 h-4" />
                Edit
              </button>

              <button
                onClick={(e) => handleButtonClick(e, onRemove)}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md"
                title="Remove order"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 border-t bg-white">
          <div className="space-y-4">
            <OrderProducts order={order} />
            {extraActions && (
              <div className="pt-4 border-t">
                {typeof extraActions === 'function' ? extraActions(order) : extraActions}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}