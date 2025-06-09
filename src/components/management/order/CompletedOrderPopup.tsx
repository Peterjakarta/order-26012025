import React, { useState } from 'react';
import { X, Printer, Mail, FileDown, Edit2, Save } from 'lucide-react';
import type { Order } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { useOrderActions } from '../../../hooks/useOrderActions';
import { branches } from '../../../data/branches';
import { formatDate } from '../../../utils/dateUtils';

interface CompletedOrderPopupProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSavePO?: (orderId: string, poNumber: string) => Promise<void>;
  onUpdateOrderDate?: (orderId: string, newDate: string) => Promise<void>;
  onUpdateProductionDate?: (orderId: string, newDate: string) => Promise<void>;
}

export default function CompletedOrderPopup({ 
  order, 
  isOpen, 
  onClose,
  onSavePO,
  onUpdateOrderDate,
  onUpdateProductionDate
}: CompletedOrderPopupProps) {
  const { products } = useStore();
  const { printOrder, emailOrder, downloadPDF } = useOrderActions();
  const [poNumber, setPoNumber] = useState(order.poNumber || '');
  const branch = branches.find(b => b.id === order.branchId);
  
  // Add state for editing order date
  const [editingOrderDate, setEditingOrderDate] = useState(false);
  const [newOrderDate, setNewOrderDate] = useState(order.orderDate.split('T')[0]);
  
  // Add state for editing production date
  const [editingProductionDate, setEditingProductionDate] = useState(false);
  const [newProductionDate, setNewProductionDate] = useState(order.completedAt ? order.completedAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    printOrder(order, poNumber);
  };

  const handleEmail = () => {
    emailOrder(order, poNumber);
  };

  const handleDownloadPDF = () => {
    downloadPDF(order, poNumber);
  };

  const handleSavePO = async () => {
    if (onSavePO) {
      await onSavePO(order.id, poNumber);
    }
  };

  // Handle saving the order date
  const handleSaveOrderDate = async () => {
    if (!onUpdateOrderDate) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await onUpdateOrderDate(order.id, newOrderDate);
      
      setSuccess('Order date updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setEditingOrderDate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order date');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle saving the production date
  const handleSaveProductionDate = async () => {
    if (!onUpdateProductionDate) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await onUpdateProductionDate(order.id, newProductionDate);
      
      setSuccess('Production date updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setEditingProductionDate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update production date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Order Details</h2>
            <p className="text-sm text-gray-600">#{order.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              {success}
            </div>
          )}
        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter PO number"
              />
              {onSavePO && poNumber !== order.poNumber && (
                <button
                  onClick={handleSavePO}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Order Date Section with Edit functionality */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Order Date
              </label>
              <button
                onClick={() => setEditingOrderDate(!editingOrderDate)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Edit2 className="w-3 h-3 mr-1" />
                {editingOrderDate ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {editingOrderDate ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newOrderDate}
                  onChange={(e) => setNewOrderDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
                <button
                  onClick={handleSaveOrderDate}
                  disabled={saving || !onUpdateOrderDate || newOrderDate === order.orderDate.split('T')[0]}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="p-2 bg-gray-50 rounded-md">
                {formatDate(order.orderDate)}
              </div>
            )}
          </div>

          {/* Production Date Section with Edit functionality */}
          {order.completedAt && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Production Date
                </label>
                <button
                  onClick={() => setEditingProductionDate(!editingProductionDate)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  {editingProductionDate ? 'Cancel' : 'Edit'}
                </button>
              </div>
              
              {editingProductionDate ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newProductionDate}
                    onChange={(e) => setNewProductionDate(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                  <button
                    onClick={handleSaveProductionDate}
                    disabled={saving || !onUpdateProductionDate || newProductionDate === order.completedAt.split('T')[0]}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-gray-50 rounded-md">
                  {formatDate(order.completedAt)}
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><span className="font-medium">Branch:</span> {branch?.name}</p>
            <p><span className="font-medium">Ordered By:</span> {order.orderedBy}</p>
            {order.poNumber && (
              <p><span className="font-medium">PO Number:</span> {order.poNumber}</p>
            )}
            {order.deliveryDate && (
              <p><span className="font-medium">Delivery Date:</span> {formatDate(order.deliveryDate)}</p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Products</h3>
            <div className="divide-y border rounded-lg">
              {order.products.map(item => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                return (
                  <div key={item.productId} className="p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          Ordered: {item.quantity} {product.unit}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className={`font-medium ${
                          (item.producedQuantity || 0) < item.quantity 
                            ? 'text-yellow-600' 
                            : 'text-green-600'
                        }`}>
                          Produced: {item.producedQuantity || 0} {product.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {order.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="border-t p-6 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <FileDown className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}