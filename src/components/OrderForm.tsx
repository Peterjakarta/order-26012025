import React, { useState, useEffect } from 'react';
import { ClipboardList, User, FileText } from 'lucide-react';
import type { OrderItem } from '../types/types';
import ProductCategoryList from './ProductCategoryList';
import OrderPreviewDialog from './order/OrderPreviewDialog';
import { useStore } from '../store/StoreContext';
import { useOrders } from '../hooks/useOrders';
import { useBranches } from '../hooks/useBranches';
import { isValidBranch } from '../data/branches';

export default function OrderForm() {
  const { categories, products } = useStore();
  const { addOrder } = useOrders();
  const { branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [orderedBy, setOrderedBy] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Clean up orderItems when products change
  useEffect(() => {
    setOrderItems(prev => prev.filter(item => 
      products.some(p => p.id === item.productId)
    ));
  }, [products]);

  const validateOrder = () => {
    if (!selectedBranch) {
      setErrorMessage('Please select a branch');
      return false;
    }

    if (!isValidBranch(selectedBranch)) {
      setErrorMessage('Invalid branch selected');
      return false;
    }

    if (!orderedBy.trim()) {
      setErrorMessage('Please enter your name');
      return false;
    }

    if (orderItems.length === 0) {
      setErrorMessage('Please select at least one product');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateOrder()) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
      return;
    }

    setShowPreview(true);
  };

  const handleConfirmOrder = async () => {
    try {
      await addOrder({
        branchId: selectedBranch,
        orderedBy: orderedBy.trim(),
        orderDate,
        poNumber: poNumber.trim(),
        products: orderItems.filter(item => item.quantity > 0),
        notes: notes.trim(),
        deliveryDate: orderDate // Set delivery date same as order date for now
      });

      setSubmitStatus('success');
      setShowPreview(false);
      
      // Reset form
      setSelectedBranch('');
      setOrderedBy('');
      setOrderDate(new Date().toISOString().split('T')[0]);
      setPoNumber('');
      setOrderItems([]);
      setNotes('');
      setErrorMessage('');
      
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit order');
      setSubmitStatus('error');
      setShowPreview(false);
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        {submitStatus === 'success' && (
          <div className="bg-green-50 text-green-800 p-4 rounded-md">
            Order submitted successfully!
          </div>
        )}
        
        {submitStatus === 'error' && (
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            {errorMessage || 'There was an error submitting your order. Please try again.'}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Order Information
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                id="branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="orderedBy" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Ordered By
                </span>
              </label>
              <input
                type="text"
                id="orderedBy"
                value={orderedBy}
                onChange={(e) => setOrderedBy(e.target.value)}
                required
                placeholder="Enter your name"
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PO Number
                </span>
              </label>
              <input
                type="text"
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Enter PO number (optional)"
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                id="orderDate"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Products</h2>
          <ProductCategoryList
            orderItems={orderItems}
            onQuantityChange={(productId, quantity) => {
              setOrderItems(prev => {
                const existing = prev.find(item => item.productId === productId);
                if (!existing && quantity > 0) {
                  return [...prev, { productId, quantity }];
                }
                if (quantity === 0) {
                  return prev.filter(item => item.productId !== productId);
                }
                return prev.map(item => 
                  item.productId === productId ? { ...item, quantity } : item
                );
              });
            }}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-md h-24"
            placeholder="Any special requirements or notes..."
          />
        </div>

        <button
          type="submit"
          disabled={submitStatus !== 'idle'}
          className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 transition-colors disabled:bg-pink-300"
        >
          Preview Order
        </button>
      </form>

      <OrderPreviewDialog
        isOpen={showPreview}
        branchId={selectedBranch}
        orderedBy={orderedBy}
        orderDate={orderDate}
        orderItems={orderItems}
        poNumber={poNumber}
        notes={notes}
        onConfirm={handleConfirmOrder}
        onCancel={() => setShowPreview(false)}
      />
    </>
  );
}