import React, { useState, useEffect } from 'react';
import { ClipboardList, User, FileText, CalendarDays, Loader2, Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { OrderItem } from '../types/types';
import ProductCategoryList from './ProductCategoryList';
import OrderPreviewDialog from './order/OrderPreviewDialog';
import { useStore } from '../store/StoreContext';
import { useOrders } from '../hooks/useOrders';
import { useBranches } from '../hooks/useBranches';
import { isValidBranch } from '../data/branches';
import { Button } from './ui/button';

export default function OrderForm() {
  const { categories, products } = useStore();
  const { orders, addOrder, updateOrder } = useOrders();
  const { branches } = useBranches();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse orderId from URL query parameter
  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('orderId');
  const existingOrder = orderId ? orders.find(o => o.id === orderId) : null;
  
  const [selectedBranch, setSelectedBranch] = useState(existingOrder?.branchId || '');
  const [orderedBy, setOrderedBy] = useState(existingOrder?.orderedBy || '');
  const [orderDate, setOrderDate] = useState(existingOrder?.orderDate.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState(existingOrder?.poNumber || '');
  const [orderItems, setOrderItems] = useState<OrderItem[]>(existingOrder?.products || []);
  const [notes, setNotes] = useState(existingOrder?.notes || '');
  const [showPreview, setShowPreview] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Use this to determine if we're editing an existing order
  const isEditing = !!existingOrder;

  // Initialize form with existing order data
  useEffect(() => {
    if (existingOrder) {
      setSelectedBranch(existingOrder.branchId);
      setOrderedBy(existingOrder.orderedBy);
      setOrderDate(existingOrder.orderDate.split('T')[0]);
      setPoNumber(existingOrder.poNumber || '');
      setOrderItems(existingOrder.products);
      setNotes(existingOrder.notes || '');
    }
  }, [existingOrder]);

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
      setSubmitStatus('loading');
      
      const orderData = {
        branchId: selectedBranch,
        orderedBy: orderedBy.trim(),
        orderDate,
        poNumber: poNumber.trim(),
        products: orderItems.filter(item => item.quantity > 0),
        notes: notes.trim(),
        deliveryDate: orderDate // Set delivery date same as order date for now
      };
      
      if (isEditing && orderId) {
        // Update existing order
        await updateOrder(orderId, orderData);
        setSubmitStatus('success');
        
        // Navigate back to order list or to the updated order view
        setTimeout(() => {
          navigate('/management/orders');
        }, 2000);
      } else {
        // Create new order
        await addOrder(orderData);
        setSubmitStatus('success');
        
        // Reset form for new order
        setSelectedBranch('');
        setOrderedBy('');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setPoNumber('');
        setOrderItems([]);
        setNotes('');
      }
      
      setShowPreview(false);
      setErrorMessage('');
      
      // Reset form state after success
      setTimeout(() => {
        setSubmitStatus('idle');
        
        // If we were editing, navigate back to orders list
        if (isEditing) {
          navigate('/management/orders');
        }
      }, 3000);
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit order');
      setSubmitStatus('error');
      setShowPreview(false);
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  const isFormValid = selectedBranch && orderedBy.trim() && orderItems.length > 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        {submitStatus === 'success' && (
          <div className="bg-green-50 text-green-800 p-4 rounded-lg shadow-sm border border-green-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="font-medium">{isEditing ? 'Order updated successfully!' : 'Order submitted successfully!'}</p>
            </div>
          </div>
        )}
        
        {submitStatus === 'error' && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg shadow-sm border border-red-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="font-medium">{errorMessage || 'There was an error submitting your order. Please try again.'}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-pink-600" />
            {isEditing ? 'Edit Order' : 'Order Information'}
          </h2>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 space-y-4">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                id="branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
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
                  <User className="w-4 h-4 text-gray-400" />
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
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  PO Number
                </span>
              </label>
              <input
                type="text"
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Enter PO number (optional)"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  Order Date
                </span>
              </label>
              <input
                type="date"
                id="orderDate"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-pink-600" />
            Products
          </h2>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
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
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-600" />
            Additional Notes
          </h2>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 h-24 resize-none"
              placeholder="Any special requirements or notes..."
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitStatus === 'loading' || !isFormValid}
          className="w-full"
          icon={<Send className="w-5 h-5" />}
          loading={submitStatus === 'loading'}
        >
          {isEditing ? 'Update Order' : 'Preview Order'}
        </Button>
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

// Import these components as needed
const CheckCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const ShoppingBag = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <path d="M16 10a4 4 0 0 1-8 0"></path>
  </svg>
);

const MessageSquare = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);