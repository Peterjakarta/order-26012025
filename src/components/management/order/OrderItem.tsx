import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Calendar, Edit } from 'lucide-react';
import type { Order } from '../../../types/types';
import OrderDetails from './OrderDetails';
import OrderProducts from './OrderProducts';
import OrderStatus from './OrderStatus';
import EditOrderDialog from './EditOrderDialog';
import ConfirmDialog from '../../common/ConfirmDialog';
import { useOrders } from '../../../hooks/useOrders';
import { useBranches } from '../../../hooks/useBranches';

interface OrderItemProps {
  order: Order;
  onRemove: () => void;
  onUpdateStatus: (orderId: string, status: Order['status'], producedQuantities?: Record<string, number>) => Promise<void>;
  onScheduleProduction?: (orderId: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  extraActions?: React.ReactNode;
}

export default function OrderItem({ 
  order, 
  onRemove, 
  onUpdateStatus,
  onScheduleProduction,
  selected,
  onSelect,
  extraActions
}: OrderItemProps) {
  const { updateOrder } = useOrders();
  const { branches } = useBranches();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const branch = branches.find(b => b.id === order.branchId);

  const handleUpdateStatus = async (status: Order['status'], producedQuantities?: Record<string, number>) => {
    await onUpdateStatus(order.id, status, producedQuantities);
  };

  const handleEditOrder = async (updatedOrder: Partial<Order>) => {
    await updateOrder(order.id, updatedOrder);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${selected ? 'ring-2 ring-pink-500' : ''}`}>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <button
              onClick={() => setShowProducts(!showProducts)}
              className="flex items-center gap-2 text-left w-full hover:bg-gray-50 p-2 -ml-2 rounded-md"
            >
              {showProducts ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-lg">{branch?.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {order.poNumber && (
                      <>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          PO: {order.poNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Ordered by: {order.orderedBy}
                </div>
                {order.notes && (
                  <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-md">
                    {order.notes}
                  </div>
                )}
              </div>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {extraActions}
            {onScheduleProduction && (
              <button
                onClick={() => onScheduleProduction(order.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                title="Schedule production"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
            )}
            {order.status !== 'completed' && (
              <button
                onClick={() => setShowEditDialog(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            <OrderStatus 
              order={order}
              onUpdateStatus={handleUpdateStatus}
            />
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all duration-200 hover:shadow-sm"
              title="Remove order"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
      
      {showProducts && (
        <div className="border-t px-6 py-4 bg-gray-50/50">
          <OrderProducts order={order} />
        </div>
      )}
      
      <ConfirmDialog
        isOpen={showConfirm}
        title="Remove Order"
        message="Are you sure you want to remove this order? This action cannot be undone."
        onConfirm={() => {
          onRemove();
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <EditOrderDialog
        order={order}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSave={handleEditOrder}
      />
    </div>
  );
}