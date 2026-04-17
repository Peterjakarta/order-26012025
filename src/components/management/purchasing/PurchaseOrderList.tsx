import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  ArrowLeft,
  Search,
  X,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { getPurchaseOrders } from '../../../services/purchaseOrderService';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types/types';

const STATUS_CONFIG: Record<
  PurchaseOrderStatus,
  { label: string; icon: React.ReactNode; badge: string }
> = {
  draft: {
    label: 'Draft',
    icon: <Clock className="w-3.5 h-3.5" />,
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  ordered: {
    label: 'Ordered',
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  partial: {
    label: 'Partial',
    icon: <PackageOpen className="w-3.5 h-3.5" />,
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  received: {
    label: 'Received',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban className="w-3.5 h-3.5" />,
    badge: 'bg-red-50 text-red-600 border-red-100',
  },
};

type Tab = 'open' | 'closed';

function progressPercent(po: PurchaseOrder): number {
  const totalOrdered = po.items.reduce(
    (s, i) => s + i.quantityOrdered * i.packageSize,
    0
  );
  const totalReceived = po.items.reduce((s, i) => s + i.quantityReceived, 0);
  if (totalOrdered === 0) return 0;
  return Math.min(100, Math.round((totalReceived / totalOrdered) * 100));
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openOrders = orders.filter(
    (o) => o.status !== 'received' && o.status !== 'cancelled'
  );
  const closedOrders = orders.filter(
    (o) => o.status === 'received' || o.status === 'cancelled'
  );
  const displayed = (tab === 'open' ? openOrders : closedOrders).filter((o) => {
    const s = search.toLowerCase();
    return (
      !s ||
      o.reference.toLowerCase().includes(s) ||
      o.supplier.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/management/pricing"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Pricing
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-gray-900">Purchase Orders</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/management/pricing/purchase-orders/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('open')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'open'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Open
          {openOrders.length > 0 && (
            <span className="ml-1.5 text-xs font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
              {openOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('closed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'closed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Closed
          {closedOrders.length > 0 && (
            <span className="ml-1.5 text-xs font-semibold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
              {closedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reference or supplier..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {tab === 'open'
              ? 'No open purchase orders. Create one to get started.'
              : 'No closed orders yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((po) => {
            const cfg = STATUS_CONFIG[po.status];
            const pct = progressPercent(po);
            const backorderCount = po.items.filter(
              (i) => i.quantityReceived < i.quantityOrdered * i.packageSize
            ).length;

            return (
              <Link
                key={po.id}
                to={`/management/pricing/purchase-orders/${po.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-sky-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {po.status === 'partial' && backorderCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <AlertCircle className="w-3 h-3" />
                          {backorderCount} item{backorderCount !== 1 ? 's' : ''} on backorder
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {po.reference || 'No reference'}
                      </h3>
                      {po.supplier && (
                        <span className="text-sm text-gray-500 truncate">{po.supplier}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span>
                        Ordered:{' '}
                        {new Date(po.orderDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {po.expectedDate && (
                        <span>
                          Expected:{' '}
                          {new Date(po.expectedDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      <span>
                        {po.items.length} line item{po.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {po.status !== 'draft' && po.status !== 'cancelled' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Received</span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100 ? 'bg-emerald-500' : 'bg-sky-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-sky-500 flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
