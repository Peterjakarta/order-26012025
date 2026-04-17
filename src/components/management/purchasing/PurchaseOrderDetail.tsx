import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, PackageCheck, AlertCircle, CheckCircle2, Clock, PackageOpen, Ban, Loader2, X, ChevronDown, ClipboardCheck, CreditCard as Edit2, Save, Trash2 } from 'lucide-react';
import {
  getPurchaseOrder,
  receiveAgainstPO,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from '../../../services/purchaseOrderService';
import { useStore } from '../../../store/StoreContext';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types/types';

const STATUS_CONFIG: Record<
  PurchaseOrderStatus,
  { label: string; icon: React.ReactNode; chip: string }
> = {
  draft: {
    label: 'Draft',
    icon: <Clock className="w-3.5 h-3.5" />,
    chip: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  ordered: {
    label: 'Ordered',
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
    chip: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  partial: {
    label: 'Partial — Backorder',
    icon: <PackageOpen className="w-3.5 h-3.5" />,
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  received: {
    label: 'Fully Received',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban className="w-3.5 h-3.5" />,
    chip: 'bg-red-50 text-red-600 border-red-100',
  },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { stockLevels, updateStockLevel } = useStore();

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPurchaseOrder(id);
      setPo(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isClosed =
    po?.status === 'received' || po?.status === 'cancelled';

  const pendingCount = Object.values(receipts).filter(
    (v) => v.trim() !== '' && parseFloat(v) > 0
  ).length;

  const handleReceive = async () => {
    if (!po) return;
    const receiptNums: Record<string, number> = {};
    for (const [itemId, val] of Object.entries(receipts)) {
      const n = parseFloat(val);
      if (!isNaN(n) && n > 0) receiptNums[itemId] = n;
    }
    if (Object.keys(receiptNums).length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const updated = await receiveAgainstPO(
        po,
        receiptNums,
        updateStockLevel,
        stockLevels
      );
      setPo(updated);
      setReceipts({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to process receipt. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    try {
      await updatePurchaseOrder(po.id, { status: 'cancelled' });
      setPo({ ...po, status: 'cancelled' });
      setConfirmCancel(false);
    } catch {
      setError('Failed to cancel order.');
    }
  };

  const handleSaveNotes = async () => {
    if (!po) return;
    setSavingNotes(true);
    try {
      await updatePurchaseOrder(po.id, { notes: editingNotes });
      setPo({ ...po, notes: editingNotes });
      setShowNotes(false);
    } catch {
      setError('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const confirmDeleteCode = po ? (po.reference || po.id).toUpperCase().slice(0, 6) : '';

  const handleDelete = async () => {
    if (!po || deleteCode.toUpperCase() !== confirmDeleteCode) return;
    setDeleting(true);
    try {
      await deletePurchaseOrder(po.id);
      navigate('/management/pricing/purchase-orders');
    } catch {
      setError('Failed to delete purchase order.');
      setDeleting(false);
      setDeleteStep(0);
      setDeleteCode('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-20 text-gray-400">Purchase order not found.</div>
    );
  }

  const cfg = STATUS_CONFIG[po.status];

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/management/pricing/purchase-orders"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Purchase Orders
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-gray-900 truncate max-w-xs">
              {po.reference || 'Purchase Order'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold flex-shrink-0 ${cfg.chip}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
          <button
            onClick={() => setDeleteStep(1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Supplier</div>
          <div className="text-sm font-semibold text-gray-900">{po.supplier || '—'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Order Date</div>
          <div className="text-sm font-semibold text-gray-900">
            {po.orderDate
              ? new Date(po.orderDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Expected</div>
          <div className="text-sm font-semibold text-gray-900">
            {po.expectedDate
              ? new Date(po.expectedDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </div>
        </div>
        {po.closedAt && (
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Closed</div>
            <div className="text-sm font-semibold text-gray-900">
              {new Date(po.closedAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        )}

        {/* Notes row */}
        <div className="col-span-2 md:col-span-4">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400">Notes</div>
            {!isClosed && (
              <button
                onClick={() => {
                  setEditingNotes(po.notes ?? '');
                  setShowNotes(true);
                }}
                className="text-gray-300 hover:text-sky-500 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showNotes ? (
            <div className="flex gap-2 mt-1">
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowNotes(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 mt-0.5">
              {po.notes || <span className="text-gray-300 italic">No notes</span>}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Stock updated successfully.
        </div>
      )}

      {po.status === 'received' && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          All items have been received. This order is closed.
        </div>
      )}

      {/* Line items table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ingredient
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ordered
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Received
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Remaining
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Progress
                </th>
                {!isClosed && (
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Receive Now
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.items.map((item) => {
                const orderedUnits = item.quantityOrdered;
                const remaining = Math.max(0, orderedUnits - item.quantityReceived);
                const pct =
                  orderedUnits > 0
                    ? Math.min(100, Math.round((item.quantityReceived / orderedUnits) * 100))
                    : 0;
                const isFullyReceived = item.quantityReceived >= orderedUnits;
                const receiptVal = receipts[item.id] ?? '';
                const receiptQty = parseFloat(receiptVal);
                const receiptUnits = !isNaN(receiptQty) && receiptQty > 0 ? receiptQty : null;

                return (
                  <tr
                    key={item.id}
                    className={`${isFullyReceived ? 'bg-emerald-50/40' : 'bg-white'}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 text-sm">
                        {item.ingredientName}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.packageSize} {item.unit} / {item.packageUnit}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {orderedUnits.toLocaleString()}{' '}
                        <span className="text-gray-400">{item.unit}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold ${
                          isFullyReceived ? 'text-emerald-600' : 'text-gray-700'
                        }`}
                      >
                        {item.quantityReceived.toLocaleString()}{' '}
                        <span className="font-normal text-gray-400">{item.unit}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {isFullyReceived ? (
                        <span className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600 font-medium">
                          {remaining.toLocaleString()} {item.unit}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="w-24 mx-auto">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span></span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct === 100 ? 'bg-emerald-400' : 'bg-sky-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {!isClosed && (
                      <td className="px-5 py-4 text-center">
                        {isFullyReceived ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={receiptVal}
                              onChange={(e) =>
                                setReceipts((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className={`w-24 text-center px-2 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors ${
                                receiptUnits
                                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                                  : 'border-gray-200 text-gray-700'
                              }`}
                            />
                            <span className="text-xs text-gray-500">{item.unit}</span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel confirm */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h4 className="font-semibold text-gray-900 mb-2">Cancel this order?</h4>
            <p className="text-sm text-gray-500 mb-5">
              This will mark the order as cancelled. Stock will not be affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmCancel(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete — Step 1: first warning */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h4 className="font-bold text-gray-900">Delete Purchase Order?</h4>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              You are about to permanently delete:
            </p>
            <p className="text-sm font-semibold text-gray-900 bg-gray-50 rounded-lg px-3 py-2 mb-4">
              {po.reference || 'This purchase order'} — {po.supplier}
            </p>
            <p className="text-sm text-red-600 font-medium mb-5">
              This action cannot be undone. All order history will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteStep(0)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, I want to delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete — Step 2: type confirmation code */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h4 className="font-bold text-gray-900">Confirm Deletion</h4>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Type the code below to confirm:
            </p>
            <p className="text-base font-mono font-bold text-red-600 tracking-widest bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-center">
              {confirmDeleteCode}
            </p>
            <input
              autoFocus
              type="text"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value.toUpperCase())}
              placeholder={`Type ${confirmDeleteCode}`}
              maxLength={6}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400 mb-4 uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deleteCode === confirmDeleteCode) handleDelete();
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteStep(0); setDeleteCode(''); }}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteCode !== confirmDeleteCode || deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Forever</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between bg-white border-t border-gray-200 shadow-xl px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Cancel Order
            </button>
          </div>

          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={() => setReceipts({})}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleReceive}
              disabled={pendingCount === 0 || submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  {pendingCount > 0
                    ? `Receive ${pendingCount} Item${pendingCount !== 1 ? 's' : ''}`
                    : 'Receive Stock'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
