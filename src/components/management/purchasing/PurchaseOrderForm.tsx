import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
  Save,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';
import { useStore } from '../../../store/StoreContext';
import { createPurchaseOrder } from '../../../services/purchaseOrderService';
import type { PurchaseOrderItem, PurchaseOrderStatus } from '../../../types/types';


let _itemCounter = 0;
const newId = () => `item_${++_itemCounter}_${Date.now()}`;

interface LineItem {
  id: string;
  ingredientId: string;
  quantityOrdered: string;
}

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { ingredients, stockCategories } = useStore();

  const [reference, setReference] = useState('');
  const [supplier, setSupplier] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const status: PurchaseOrderStatus = 'ordered';
  const [lines, setLines] = useState<LineItem[]>([{ id: newId(), ingredientId: '', quantityOrdered: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryIngredients, setCategoryIngredients] = useState<Record<string, string[]>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectingForLine, setSelectingForLine] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(query(collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS)));
      const map: Record<string, string[]> = {};
      snap.forEach((d) => {
        const { category_id, ingredient_id } = d.data();
        if (!map[category_id]) map[category_id] = [];
        map[category_id].push(ingredient_id);
      });
      setCategoryIngredients(map);
    };
    load();
  }, []);

  const selectedIngredientIds = new Set(lines.map((l) => l.ingredientId).filter(Boolean));

  const filteredIngredients = useMemo(() => {
    const s = ingredientSearch.toLowerCase().trim();
    return s
      ? ingredients.filter((i) => i.name.toLowerCase().includes(s))
      : ingredients;
  }, [ingredients, ingredientSearch]);

  const uncategorized = filteredIngredients.filter(
    (i) => !Object.values(categoryIngredients).some((ids) => ids.includes(i.id))
  );

  const handleSelectIngredient = (ingredientId: string) => {
    if (!selectingForLine) return;
    setLines((prev) =>
      prev.map((l) =>
        l.id === selectingForLine ? { ...l, ingredientId } : l
      )
    );
    setSelectingForLine(null);
    setIngredientSearch('');
  };

  const addLine = () =>
    setLines((prev) => [...prev, { id: newId(), ingredientId: '', quantityOrdered: '' }]);

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const handleSave = async () => {
    if (!reference.trim()) { setError('Reference is required'); return; }
    if (!supplier.trim()) { setError('Supplier is required'); return; }
    if (!orderDate) { setError('Order date is required'); return; }

    const validLines = lines.filter(
      (l) => l.ingredientId && parseFloat(l.quantityOrdered) > 0
    );
    if (validLines.length === 0) {
      setError('Add at least one ingredient with a quantity');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const items: PurchaseOrderItem[] = validLines.map((l) => {
        const ing = ingredients.find((i) => i.id === l.ingredientId)!;
        return {
          id: l.id,
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.unit,
          packageSize: ing.packageSize,
          packageUnit: ing.packageUnit,
          quantityOrdered: parseFloat(l.quantityOrdered),
          quantityReceived: 0,
        };
      });

      await createPurchaseOrder({
        reference: reference.trim(),
        supplier: supplier.trim(),
        orderDate,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        status,
        items,
      });

      navigate('/management/pricing/purchase-orders');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('missing or insufficient')) {
        setError('Permission denied. Your account does not have access to create purchase orders. Contact an administrator.');
      } else {
        setError(`Failed to save purchase order: ${msg || 'Please try again.'}`);
      }
      console.error('Purchase order save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
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
          <ShoppingCart className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-bold text-gray-900">New Purchase Order</h2>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Reference / PO Number *
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. PO-2026-001"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Supplier *
          </label>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Supplier name"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Order Date *
          </label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Expected Delivery
          </label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional notes..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Order Items</h3>
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </div>

        <div className="space-y-2">
          {lines.map((line, idx) => {
            const ing = ingredients.find((i) => i.id === line.ingredientId);
            const qty = parseFloat(line.quantityOrdered);
            const hasQty = ing && !isNaN(qty) && qty > 0;

            return (
              <div
                key={line.id}
                className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
              >
                <span className="text-xs font-semibold text-gray-400 w-5 text-center">
                  {idx + 1}
                </span>

                {/* Ingredient picker */}
                <div className="flex-1 min-w-[200px]">
                  {ing ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                        <div className="text-xs text-gray-500">
                          {ing.packageSize} {ing.unit} / {ing.packageUnit}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setLines((prev) =>
                            prev.map((l) =>
                              l.id === line.id ? { ...l, ingredientId: '' } : l
                            )
                          );
                        }}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectingForLine(line.id);
                        setIngredientSearch('');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:border-sky-400 hover:text-sky-500 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Select ingredient
                    </button>
                  )}
                </div>

                {/* Qty — total amount in stock units */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">
                    Amount {ing ? `(${ing.unit})` : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantityOrdered}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.id === line.id ? { ...l, quantityOrdered: e.target.value } : l
                          )
                        )
                      }
                      placeholder="0"
                      className="w-28 text-center px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    {ing && (
                      <span className="text-xs text-gray-500">{ing.unit}</span>
                    )}
                  </div>
                  {hasQty && (
                    <span className="text-xs text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-medium">
                      = {qty.toLocaleString()} {ing!.unit} added to stock
                    </span>
                  )}
                </div>

                <button
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length === 1}
                  className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          to="/management/pricing/purchase-orders"
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Purchase Order'}
        </button>
      </div>

      {/* Ingredient picker modal */}
      {selectingForLine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">Select Ingredient</h4>
              <button
                onClick={() => { setSelectingForLine(null); setIngredientSearch(''); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder="Search ingredients..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-2 py-2 space-y-1">
              {stockCategories.map((cat) => {
                const ids = categoryIngredients[cat.id] || [];
                const catItems = filteredIngredients.filter((i) => ids.includes(i.id));
                if (catItems.length === 0) return null;
                const isExpanded = expandedCategory === cat.id;

                return (
                  <div key={cat.id} className="rounded-lg border border-gray-100 overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      {cat.name}
                      <span className="ml-auto text-xs text-gray-400">{catItems.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-gray-50">
                        {catItems.map((ing) => (
                          <button
                            key={ing.id}
                            onClick={() => handleSelectIngredient(ing.id)}
                            disabled={selectedIngredientIds.has(ing.id) && lines.find(l => l.id === selectingForLine)?.ingredientId !== ing.id}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                              <div className="text-xs text-gray-500">
                                {ing.packageSize} {ing.unit} / {ing.packageUnit}
                              </div>
                            </div>
                            {selectedIngredientIds.has(ing.id) && (
                              <span className="text-xs text-sky-500">selected</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {uncategorized.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === '__uncat' ? null : '__uncat'
                      )
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                  >
                    {expandedCategory === '__uncat' ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    Uncategorized
                    <span className="ml-auto text-xs text-gray-400">{uncategorized.length}</span>
                  </button>
                  {expandedCategory === '__uncat' && (
                    <div className="divide-y divide-gray-50">
                      {uncategorized.map((ing) => (
                        <button
                          key={ing.id}
                          onClick={() => handleSelectIngredient(ing.id)}
                          disabled={selectedIngredientIds.has(ing.id) && lines.find(l => l.id === selectingForLine)?.ingredientId !== ing.id}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                            <div className="text-xs text-gray-500">
                              {ing.packageSize} {ing.unit} / {ing.packageUnit}
                            </div>
                          </div>
                          {selectedIngredientIds.has(ing.id) && (
                            <span className="text-xs text-sky-500">selected</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {filteredIngredients.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No ingredients found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
