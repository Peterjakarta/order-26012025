import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Package,
  Hash,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  FileText,
  Filter,
  ShoppingCart,
  Copy
} from 'lucide-react';
import { db, COLLECTIONS } from '../../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/StoreContext';
import { useOrders } from '../../hooks/useOrders';
import { useBranches } from '../../hooks/useBranches';

interface BatchNumber {
  id: string;
  batch_number: string;
  batch_date: string;
  product_name: string;
  product_id?: string;
  order_id?: string;
  quantity: number;
  unit: string;
  expiry_date?: string;
  production_notes?: string;
  status: 'active' | 'expired' | 'recalled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function BatchNumbers() {
  const { user } = useAuth();
  const { products } = useStore();
  const { orders } = useOrders();
  const { branches } = useBranches();
  const [batches, setBatches] = useState<BatchNumber[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BatchNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchNumber | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const [formData, setFormData] = useState({
    batch_number: '',
    batch_date: new Date().toISOString().split('T')[0],
    product_name: '',
    quantity: '',
    unit: 'kg',
    expiry_date: '',
    production_notes: '',
    status: 'active' as const
  });

  // Filter completed orders
  const completedOrders = orders.filter(order => order.status === 'completed');

  // Handler for order selection
  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = orders.find(o => o.id === orderId);

    if (order) {
      // Pre-fill batch number if order has one
      if (order.batchNumber) {
        setFormData(prev => ({
          ...prev,
          batch_number: order.batchNumber || '',
          batch_date: order.completedAt ? order.completedAt.split('T')[0] : prev.batch_date
        }));
      }

      // Pre-fill with first product if order has products
      if (order.products && order.products.length > 0) {
        const firstProduct = products.find(p => p.id === order.products[0].productId);
        if (firstProduct) {
          setSelectedProductId(firstProduct.id);
          setFormData(prev => ({
            ...prev,
            product_name: firstProduct.name,
            quantity: order.products[0].producedQuantity?.toString() || order.products[0].quantity.toString(),
            unit: firstProduct.unit || 'kg'
          }));
        }
      }
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    filterBatches();
  }, [batches, searchTerm, statusFilter]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const batchesRef = collection(db, COLLECTIONS.BATCH_NUMBERS);
      const q = query(batchesRef, orderBy('batch_date', 'desc'));
      const snapshot = await getDocs(q);

      const batchData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          batch_number: data.batch_number,
          batch_date: data.batch_date,
          product_name: data.product_name,
          product_id: data.product_id,
          order_id: data.order_id,
          quantity: data.quantity,
          unit: data.unit,
          expiry_date: data.expiry_date,
          production_notes: data.production_notes,
          status: data.status,
          created_by: data.created_by,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString()
        } as BatchNumber;
      });

      setBatches(batchData);
    } catch (error) {
      console.error('Error fetching batches:', error);
      alert('Failed to load batch numbers');
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = [...batches];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        batch =>
          batch.batch_number.toLowerCase().includes(term) ||
          batch.product_name.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status === statusFilter);
    }

    setFilteredBatches(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.batch_number || !formData.product_name || !formData.quantity) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const batchData = {
        batch_number: formData.batch_number,
        batch_date: formData.batch_date,
        product_name: formData.product_name,
        product_id: selectedProductId || null,
        order_id: selectedOrderId || null,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiry_date: formData.expiry_date || null,
        production_notes: formData.production_notes || null,
        status: formData.status,
        created_by: user?.email || 'Unknown',
        updated_at: serverTimestamp()
      };

      const batchesRef = collection(db, COLLECTIONS.BATCH_NUMBERS);

      if (editingBatch) {
        const batchDoc = doc(db, COLLECTIONS.BATCH_NUMBERS, editingBatch.id);
        await updateDoc(batchDoc, batchData);
      } else {
        await addDoc(batchesRef, {
          ...batchData,
          created_at: serverTimestamp()
        });
      }

      resetForm();
      fetchBatches();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      alert('Failed to save batch number');
    }
  };

  const handleEdit = (batch: BatchNumber) => {
    setEditingBatch(batch);
    setFormData({
      batch_number: batch.batch_number,
      batch_date: batch.batch_date,
      product_name: batch.product_name,
      quantity: batch.quantity.toString(),
      unit: batch.unit,
      expiry_date: batch.expiry_date || '',
      production_notes: batch.production_notes || '',
      status: batch.status
    });
    setSelectedProductId(batch.product_id || '');
    setSelectedOrderId(batch.order_id || '');
    setShowAddDialog(true);
  };

  const handleCopy = (batch: BatchNumber) => {
    // Generate a new batch number by appending "-COPY" or incrementing
    const newBatchNumber = `${batch.batch_number}-COPY`;

    setEditingBatch(null); // Important: not editing, creating new
    setFormData({
      batch_number: newBatchNumber,
      batch_date: new Date().toISOString().split('T')[0], // Today's date
      product_name: batch.product_name,
      quantity: batch.quantity.toString(),
      unit: batch.unit,
      expiry_date: '', // Clear expiry date for new batch
      production_notes: batch.production_notes || '',
      status: 'active' // Always set to active for new batch
    });
    setSelectedProductId(batch.product_id || '');
    setSelectedOrderId(''); // Don't copy order link
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this batch number?')) return;

    try {
      const batchDoc = doc(db, COLLECTIONS.BATCH_NUMBERS, id);
      await deleteDoc(batchDoc);
      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch number');
    }
  };

  const resetForm = () => {
    setFormData({
      batch_number: '',
      batch_date: new Date().toISOString().split('T')[0],
      product_name: '',
      quantity: '',
      unit: 'kg',
      expiry_date: '',
      production_notes: '',
      status: 'active'
    });
    setSelectedProductId('');
    setSelectedOrderId('');
    setEditingBatch(null);
    setShowAddDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'recalled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4" />;
      case 'recalled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading batch numbers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Batch Numbers</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track batch numbers for completed orders and newly made products
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Batch Number
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by batch number or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="recalled">Recalled</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredBatches.length} of {batches.length} batch numbers
        </div>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No batch numbers found</p>
          <p className="text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first batch number to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-green-600" />
                      <span className="text-lg font-bold text-gray-900">
                        {batch.batch_number}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                        batch.status
                      )}`}
                    >
                      {getStatusIcon(batch.status)}
                      {batch.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 flex items-center gap-1 mb-1">
                        <Package className="w-4 h-4" />
                        Product
                      </div>
                      <div className="font-medium text-gray-900">
                        {batch.product_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 flex items-center gap-1 mb-1">
                        <Calendar className="w-4 h-4" />
                        Batch Date
                      </div>
                      <div className="font-medium text-gray-900">
                        {new Date(batch.batch_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 mb-1">Quantity</div>
                      <div className="font-medium text-gray-900">
                        {batch.quantity} {batch.unit}
                      </div>
                    </div>

                    {batch.expiry_date && (
                      <div>
                        <div className="text-gray-500 flex items-center gap-1 mb-1">
                          <AlertCircle className="w-4 h-4" />
                          Expiry Date
                        </div>
                        <div className="font-medium text-gray-900">
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {batch.order_id && (() => {
                      const linkedOrder = orders.find(o => o.id === batch.order_id);
                      const branch = linkedOrder ? branches.find(b => b.id === linkedOrder.branchId) : null;
                      return (
                        <div>
                          <div className="text-gray-500 flex items-center gap-1 mb-1">
                            <ShoppingCart className="w-4 h-4" />
                            Linked Order
                          </div>
                          <div className="font-medium text-blue-600">
                            {linkedOrder ? `Order #${linkedOrder.orderNumber || linkedOrder.id.slice(0, 8)} - ${branch?.name}` : 'Order not found'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {batch.production_notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500 text-xs flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3" />
                        Production Notes
                      </div>
                      <div className="text-sm text-gray-700">
                        {batch.production_notes}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Created by {batch.created_by} on{' '}
                    {new Date(batch.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(batch)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleCopy(batch)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Copy Batch"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(batch.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBatch ? 'Edit Batch Number' : 'Add New Batch Number'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) =>
                      setFormData({ ...formData, batch_number: e.target.value })
                    }
                    placeholder="e.g., B20250130-001"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Date *
                  </label>
                  <input
                    type="date"
                    value={formData.batch_date}
                    onChange={(e) =>
                      setFormData({ ...formData, batch_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Order Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Link to Completed Order (Optional)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- Select an Order (Optional) --</option>
                  {completedOrders.map((order) => {
                    const branch = branches.find(b => b.id === order.branchId);
                    const completedDate = order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A';
                    return (
                      <option key={order.id} value={order.id}>
                        Order #{order.orderNumber || order.id.slice(0, 8)} - {branch?.name} - {completedDate}
                      </option>
                    );
                  })}
                </select>
                {selectedOrderId && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Order linked - batch info auto-filled
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setSelectedProductId(productId);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                      setFormData({
                        ...formData,
                        product_name: product.name,
                        unit: product.unit || 'kg'
                      });
                    } else {
                      setFormData({ ...formData, product_name: '' });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Select a Product --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
                {formData.product_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {formData.product_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="pcs">pcs</option>
                    <option value="box">box</option>
                    <option value="bag">bag</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'active' | 'expired' | 'recalled'
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="recalled">Recalled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Production Notes
                </label>
                <textarea
                  value={formData.production_notes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      production_notes: e.target.value
                    })
                  }
                  placeholder="Add any relevant production notes..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingBatch ? 'Update Batch' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
