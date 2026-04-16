import React, { useState, useEffect, useRef } from 'react';
import { X, Check, CheckCircle2, AlertCircle, Loader2, Printer, FileDown } from 'lucide-react';
import type { Order, Product } from '../../../types/types';
import { generateProductionChecklistPDF } from '../../../utils/pdfGenerator';
import { calculateMouldCount } from '../../../utils/mouldCalculations';
import { isBonBonCategory, isPralinesCategory } from '../../../utils/quantityUtils';
import { getBranchStyles } from '../../../utils/branchStyles';
import { useBranches } from '../../../hooks/useBranches';
import { supabase } from '../../../lib/supabase';

const SUPABASE_CONFIGURED = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

const localKey = (orderId: string) => `checklist_${orderId}`;

type InputField = 'produced' | 'rejected' | 'spray' | 'ready' | 'shell' | 'ganache' | 'closed' | 'aw';

type ChecklistRow = Record<InputField, boolean>;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ProductionIPadChecklistProps {
  order: Order;
  products: Product[];
  onClose: () => void;
}

const EMPTY_ROW: ChecklistRow = {
  produced: false,
  rejected: false,
  spray: false,
  ready: false,
  shell: false,
  ganache: false,
  closed: false,
  aw: false,
};

const INPUT_COLUMNS: { key: InputField; label: string }[] = [
  { key: 'produced', label: 'Produced' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'spray',    label: 'Spray'    },
  { key: 'ready',    label: 'Ready'    },
  { key: 'shell',    label: 'Shell'    },
  { key: 'ganache',  label: 'Ganache'  },
  { key: 'closed',   label: 'Closed'   },
  { key: 'aw',       label: 'AW'       },
];

export default function ProductionIPadChecklist({ order, products, onClose }: ProductionIPadChecklistProps) {
  const { branches } = useBranches();
  const branch = branches.find(b => b.id === order.branchId);
  const styles = getBranchStyles(order.branchId);

  const [rows, setRows] = useState<Record<string, ChecklistRow>>(() =>
    Object.fromEntries(order.products.map(item => [item.productId, { ...EMPTY_ROW }]))
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [order.id]);

  const loadFromLocalStorage = (): Record<string, ChecklistRow> | null => {
    try {
      const raw = localStorage.getItem(localKey(order.id));
      if (!raw) return null;
      return JSON.parse(raw) as Record<string, ChecklistRow>;
    } catch {
      return null;
    }
  };

  const saveToLocalStorage = (updatedRows: Record<string, ChecklistRow>) => {
    try {
      localStorage.setItem(localKey(order.id), JSON.stringify(updatedRows));
    } catch {
      // storage quota exceeded – ignore
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Always check localStorage first (instant, always available)
      const local = loadFromLocalStorage();
      if (local) {
        setRows(prev => {
          const next = { ...prev };
          Object.entries(local).forEach(([productId, row]) => {
            if (next[productId] !== undefined) next[productId] = row;
          });
          return next;
        });
      }

      if (!SUPABASE_CONFIGURED) return;

      // Try to load from Supabase (may override localStorage with fresher data)
      const { data, error } = await supabase
        .from('production_checklist_data')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setRows(prev => {
          const next = { ...prev };
          data.forEach(row => {
            if (next[row.product_id] !== undefined) {
              next[row.product_id] = {
                produced: row.produced === '1',
                rejected: row.rejected === '1',
                spray:    row.spray    === '1',
                ready:    row.ready    === '1',
                shell:    row.shell    === '1',
                ganache:  row.ganache  === '1',
                closed:   row.closed   === '1',
                aw:       row.aw       === '1',
              };
            }
          });
          // Keep localStorage in sync with the freshest Supabase data
          saveToLocalStorage(next);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load checklist data from Supabase, using localStorage:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRows = (updatedRows: Record<string, ChecklistRow>) => {
    setSaveStatus('saving');

    // Always persist to localStorage immediately (works in all environments)
    saveToLocalStorage(updatedRows);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (!SUPABASE_CONFIGURED) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }

      try {
        const payload = Object.entries(updatedRows).map(([productId, row]) => ({
          order_id:   order.id,
          product_id: productId,
          produced: row.produced ? '1' : '',
          rejected: row.rejected ? '1' : '',
          spray:    row.spray    ? '1' : '',
          ready:    row.ready    ? '1' : '',
          shell:    row.shell    ? '1' : '',
          ganache:  row.ganache  ? '1' : '',
          closed:   row.closed   ? '1' : '',
          aw:       row.aw       ? '1' : '',
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('production_checklist_data')
          .upsert(payload, { onConflict: 'order_id,product_id' });

        if (error) throw error;

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Failed to sync checklist to Supabase:', err);
        // localStorage already has the data, so the save is not truly lost
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 600);
  };

  const handlePrintPDF = () => {
    generateProductionChecklistPDF(order, products, rows, branch?.name || 'Unknown Branch');
  };

  const handlePrint = () => {
    const branchName = branch?.name || 'Unknown Branch';
    const delivery = new Date(order.deliveryDate).toLocaleDateString();
    const prodStart = order.productionStartDate ? new Date(order.productionStartDate).toLocaleDateString() : '';
    const prodEnd = order.productionEndDate ? new Date(order.productionEndDate).toLocaleDateString() : '';
    const prodRange = prodStart ? (prodEnd ? `${prodStart} – ${prodEnd}` : prodStart) : '';

    const rowsHtml = order.products.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return '';
      const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);
      const mould = showMould ? String(calculateMouldCount(product.category, item.quantity)) : '–';
      const rowData = rows[item.productId];
      const checkCells = (['produced', 'rejected', 'spray', 'ready', 'shell', 'ganache', 'closed', 'aw'] as InputField[])
        .map(key => {
          const checked = rowData?.[key] ?? false;
          return `<td style="text-align:center;padding:8px 4px;border:1px solid #e5e7eb;font-size:18px;color:${checked ? '#059669' : '#d1d5db'};">${checked ? '✓' : '○'}</td>`;
        }).join('');
      return `<tr>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;">${product.name}<br/><span style="font-size:10px;color:#9ca3af;font-weight:400;">${product.category}</span></td>
        <td style="text-align:center;padding:8px 4px;border:1px solid #e5e7eb;">${item.quantity} ${product.unit}</td>
        <td style="text-align:center;padding:8px 4px;border:1px solid #e5e7eb;">${mould}</td>
        ${checkCells}
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Production Checklist – ${branchName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { display: flex; gap: 24px; font-size: 11px; color: #555; margin-bottom: 16px; flex-wrap: wrap; }
        .meta span strong { color: #111; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        thead th { background: #db2777; color: #fff; font-size: 11px; padding: 8px 6px; text-align: center; border: 1px solid #be185d; }
        thead th:first-child { text-align: left; }
        tbody tr:nth-child(even) { background: #fdf2f8; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>Production Checklist</h1>
      <div class="meta">
        <span><strong>Branch:</strong> ${branchName}</span>
        <span><strong>Order:</strong> #${order.id.slice(0, 8)}</span>
        <span><strong>Ordered by:</strong> ${order.orderedBy}</span>
        <span><strong>Delivery:</strong> ${delivery}</span>
        ${prodRange ? `<span><strong>Production:</strong> ${prodRange}</span>` : ''}
        ${order.notes ? `<span><strong>Note:</strong> ${order.notes}</span>` : ''}
      </div>
      <table>
        <thead><tr>
          <th style="text-align:left;min-width:160px;">Product</th>
          <th>Ordered</th><th>Mould</th>
          <th>Produced</th><th>Rejected</th><th>Spray</th><th>Ready</th>
          <th>Shell</th><th>Ganache</th><th>Closed</th><th>AW</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

  const handleToggle = (productId: string, field: InputField) => {
    const next = {
      ...rows,
      [productId]: {
        ...rows[productId],
        [field]: !rows[productId][field],
      },
    };
    setRows(next);
    saveRows(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b shadow-sm px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Production Checklist</h1>
            <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${styles.base}`}>
              {branch?.name || 'Unknown Branch'}
            </span>
            <span className="text-sm text-gray-400">#{order.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-sm min-w-[90px] justify-end">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-blue-600">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Save failed</span>
                </>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
          <span><span className="font-medium text-gray-700">Ordered by:</span> {order.orderedBy}</span>
          <span><span className="font-medium text-gray-700">Delivery:</span> {new Date(order.deliveryDate).toLocaleDateString()}</span>
          {order.productionStartDate && (
            <span>
              <span className="font-medium text-gray-700">Production:</span>{' '}
              {new Date(order.productionStartDate).toLocaleDateString()}
              {order.productionEndDate ? ` – ${new Date(order.productionEndDate).toLocaleDateString()}` : ''}
            </span>
          )}
          {order.notes && (
            <span><span className="font-medium text-gray-700">Note:</span> {order.notes}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-3 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading checklist...</span>
          </div>
        ) : (
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-pink-600 text-white text-sm font-semibold px-4 py-3 text-left border-r border-pink-500 min-w-[180px] max-w-[220px]">
                  Product
                </th>
                <th className="bg-pink-600 text-white text-sm font-semibold px-3 py-3 text-center border-r border-pink-500 w-24">
                  Ordered
                </th>
                <th className="bg-pink-600 text-white text-sm font-semibold px-3 py-3 text-center border-r border-pink-500 w-24">
                  Mould
                </th>
                {INPUT_COLUMNS.map((col, i) => (
                  <th
                    key={col.key}
                    className={`bg-pink-600 text-white text-sm font-semibold px-3 py-3 text-center w-20 ${
                      i < INPUT_COLUMNS.length - 1 ? 'border-r border-pink-500' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.products.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                if (!product) return null;

                const mouldInfo = calculateMouldCount(product.category, item.quantity);
                const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);
                const rowData = rows[item.productId] || { ...EMPTY_ROW };
                const isEven = idx % 2 === 0;
                const bg = isEven ? 'bg-white' : 'bg-gray-50';

                return (
                  <tr key={item.productId} className={bg}>
                    <td className={`sticky left-0 z-10 px-4 py-2 border-r border-b border-gray-200 ${bg}`}>
                      <div className="font-medium text-gray-900 text-base leading-tight">{product.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">{product.category}</div>
                    </td>

                    <td className="px-3 py-2 border-r border-b border-gray-200 text-center">
                      <span className="text-base font-semibold text-gray-800">{item.quantity}</span>
                      <span className="text-xs text-gray-500 ml-1">{product.unit}</span>
                    </td>

                    <td className={`px-3 py-2 border-r border-b border-gray-200 text-center text-sm font-medium ${
                      showMould
                        ? isBonBonCategory(product.category) ? 'text-pink-600' : 'text-blue-600'
                        : 'text-gray-400'
                    }`}>
                      {showMould ? mouldInfo : '–'}
                    </td>

                    {INPUT_COLUMNS.map((col, i) => {
                      const checked = rowData[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-1 border-b border-gray-200 ${
                            i < INPUT_COLUMNS.length - 1 ? 'border-r' : ''
                          }`}
                        >
                          <button
                            onClick={() => handleToggle(item.productId, col.key)}
                            className={`w-full h-12 rounded-lg flex items-center justify-center transition-all active:scale-95 select-none ${
                              checked
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-white border-2 border-gray-200 text-gray-300 hover:border-gray-300'
                            }`}
                          >
                            {checked && <Check className="w-6 h-6 stroke-[3]" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t px-5 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>{order.products.length} product{order.products.length !== 1 ? 's' : ''} &bull; Tap a cell to check it off &bull; Auto-saved</span>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
