import React, { useState, useEffect, useMemo } from 'react';
import {
  PackagePlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
  ClipboardCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';
import { useStore } from '../../../store/StoreContext';
import type { Ingredient, StockCategory } from '../../../types/types';

interface ResultEntry {
  ingredientId: string;
  name: string;
  added: number;
  unit: string;
  newTotal: number;
  error?: string;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ReceiveStock() {
  const { ingredients, stockLevels, updateStockLevel, stockCategories } = useStore();

  const [categoryIngredients, setCategoryIngredients] = useState<Record<string, string[]>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiveDate, setReceiveDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [packages, setPackages] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS)));
        const map: Record<string, string[]> = {};
        snap.forEach((doc) => {
          const { category_id, ingredient_id } = doc.data();
          if (!map[category_id]) map[category_id] = [];
          map[category_id].push(ingredient_id);
        });
        setCategoryIngredients(map);
      } catch (err) {
        console.error('Error loading category ingredients:', err);
      }
    };
    load();
  }, []);

  const calcUnits = (ingredient: Ingredient, pkgsStr: string): number => {
    const pkgs = parseFloat(pkgsStr);
    if (isNaN(pkgs) || pkgs <= 0) return 0;
    return pkgs * ingredient.packageSize;
  };

  const pendingCount = useMemo(
    () =>
      Object.values(packages).filter((v) => v.trim() !== '' && parseFloat(v) > 0).length,
    [packages]
  );

  const searchLower = search.toLowerCase().trim();

  const matchesSearch = (ingredient: Ingredient) => {
    if (!searchLower) return true;
    return (
      ingredient.name.toLowerCase().includes(searchLower) ||
      ingredient.unit.toLowerCase().includes(searchLower) ||
      ingredient.packageUnit.toLowerCase().includes(searchLower)
    );
  };

  const handleSubmit = async () => {
    const toProcess = Object.entries(packages).filter(
      ([, v]) => v.trim() !== '' && parseFloat(v) > 0
    );
    if (toProcess.length === 0) return;

    setSubmitStatus('submitting');
    const resultEntries: ResultEntry[] = [];

    for (const [ingredientId, pkgsStr] of toProcess) {
      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (!ingredient) continue;

      const addedUnits = calcUnits(ingredient, pkgsStr);
      const currentQty = stockLevels[ingredientId]?.quantity ?? 0;
      const newQty = currentQty + addedUnits;

      try {
        await updateStockLevel(ingredientId, {
          quantity: newQty,
          changeType: 'receipt',
        });
        resultEntries.push({
          ingredientId,
          name: ingredient.name,
          added: addedUnits,
          unit: ingredient.unit,
          newTotal: newQty,
        });
      } catch (err) {
        resultEntries.push({
          ingredientId,
          name: ingredient.name,
          added: addedUnits,
          unit: ingredient.unit,
          newTotal: currentQty,
          error: err instanceof Error ? err.message : 'Failed to update',
        });
      }
    }

    const hasErrors = resultEntries.some((r) => r.error);
    setResults(resultEntries);
    setSubmitStatus(hasErrors ? 'error' : 'success');
    setShowSummary(true);

    if (!hasErrors) {
      setPackages({});
      setReferenceNumber('');
    }
  };

  const handleReset = () => {
    setPackages({});
    setResults([]);
    setSubmitStatus('idle');
    setShowSummary(false);
    setReferenceNumber('');
    setReceiveDate(new Date().toISOString().slice(0, 10));
  };

  const uncategorized = ingredients.filter(
    (i) => !Object.values(categoryIngredients).some((ids) => ids.includes(i.id))
  );

  const renderIngredientRow = (ingredient: Ingredient, idx: number) => {
    const currentQty = stockLevels[ingredient.id]?.quantity ?? 0;
    const minStock = stockLevels[ingredient.id]?.minStock;
    const isLow = minStock !== undefined && currentQty <= minStock;
    const pkgsStr = packages[ingredient.id] ?? '';
    const addedUnits = calcUnits(ingredient, pkgsStr);
    const newTotal = currentQty + addedUnits;
    const hasValue = pkgsStr.trim() !== '' && parseFloat(pkgsStr) > 0;
    const isEven = idx % 2 === 0;

    return (
      <tr
        key={ingredient.id}
        className={`transition-colors ${
          hasValue
            ? 'bg-emerald-50'
            : isEven
            ? 'bg-white hover:bg-gray-50/60'
            : 'bg-gray-50/40 hover:bg-gray-50/80'
        }`}
      >
        <td className="px-5 py-3">
          <div className="font-medium text-gray-900 text-sm">{ingredient.name}</div>
          {isLow && (
            <div className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
              <AlertCircle className="w-3 h-3" />
              Below minimum
            </div>
          )}
        </td>

        <td className="px-5 py-3 text-right whitespace-nowrap">
          <span className={`text-sm font-semibold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
            {currentQty.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400 ml-1">{ingredient.unit}</span>
        </td>

        <td className="px-5 py-3 text-center whitespace-nowrap">
          <span className="text-sm text-gray-600">
            {ingredient.packageSize.toLocaleString()} {ingredient.unit}
          </span>
          <span className="text-xs text-gray-400 ml-1">/ {ingredient.packageUnit}</span>
        </td>

        <td className="px-5 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min="0"
              step="0.01"
              value={pkgsStr}
              onChange={(e) =>
                setPackages((prev) => ({ ...prev, [ingredient.id]: e.target.value }))
              }
              placeholder="0"
              className={`w-24 text-center px-2 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors ${
                hasValue
                  ? 'border-emerald-300 bg-white text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            />
            <span className="text-xs text-gray-500 w-8 text-left">{ingredient.packageUnit}</span>
          </div>
        </td>

        <td className="px-5 py-3 text-right whitespace-nowrap">
          {hasValue ? (
            <span className="text-sm font-semibold text-emerald-600">
              +{addedUnits.toLocaleString()} {ingredient.unit}
            </span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>

        <td className="px-5 py-3 text-right whitespace-nowrap">
          {hasValue ? (
            <span className="text-sm font-bold text-gray-900">
              {newTotal.toLocaleString()} {ingredient.unit}
            </span>
          ) : (
            <span className="text-sm text-gray-300">—</span>
          )}
        </td>

        <td className="px-2 py-3 text-center w-8">
          {hasValue && (
            <button
              onClick={() =>
                setPackages((prev) => {
                  const next = { ...prev };
                  delete next[ingredient.id];
                  return next;
                })
              }
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const tableHeader = (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Ingredient
        </th>
        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Current Stock
        </th>
        <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Package Size
        </th>
        <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Packages Received
        </th>
        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Will Add
        </th>
        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
          New Total
        </th>
        <th className="w-8" />
      </tr>
    </thead>
  );

  const renderCategory = (category: StockCategory) => {
    const ids = categoryIngredients[category.id] || [];
    const categoryItems = ingredients
      .filter((i) => ids.includes(i.id))
      .filter(matchesSearch);

    if (searchLower && categoryItems.length === 0) return null;

    const isExpanded = expandedCategory === category.id;

    const pendingInCategory = categoryItems.filter((i) => {
      const v = packages[i.id] ?? '';
      return v.trim() !== '' && parseFloat(v) > 0;
    }).length;

    return (
      <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() =>
            setExpandedCategory(isExpanded ? null : category.id)
          }
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
            <div className="text-left">
              <div className="font-semibold text-gray-900">{category.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {categoryItems.length} ingredient{categoryItems.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
          {pendingInCategory > 0 && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
              {pendingInCategory} item{pendingInCategory !== 1 ? 's' : ''} queued
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="min-w-full">
              {tableHeader}
              <tbody className="divide-y divide-gray-100">
                {categoryItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                      No ingredients in this category
                    </td>
                  </tr>
                ) : (
                  categoryItems.map((ingredient, idx) =>
                    renderIngredientRow(ingredient, idx)
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const uncategorizedFiltered = uncategorized.filter(matchesSearch);

  return (
    <div className="space-y-6 pb-32">
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
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Receive Stock</h2>
          </div>
        </div>
        {pendingCount > 0 && submitStatus !== 'submitting' && (
          <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {pendingCount} item{pendingCount !== 1 ? 's' : ''} ready to receive
          </span>
        )}
      </div>

      {/* Summary after submit */}
      {showSummary && results.length > 0 && (
        <div
          className={`rounded-xl border p-5 ${
            submitStatus === 'success'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 mb-3">
              {submitStatus === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <span className={`font-semibold ${submitStatus === 'success' ? 'text-emerald-800' : 'text-amber-800'}`}>
                {submitStatus === 'success'
                  ? `${results.length} item${results.length !== 1 ? 's' : ''} received successfully`
                  : 'Some items could not be updated'}
              </span>
            </div>
            <button onClick={handleReset} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            {results.map((r) => (
              <div key={r.ingredientId} className="flex items-center gap-2 text-sm">
                {r.error ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                )}
                <span className="font-medium text-gray-800">{r.name}</span>
                {r.error ? (
                  <span className="text-red-600">— {r.error}</span>
                ) : (
                  <span className="text-gray-500">
                    +{r.added.toLocaleString()} {r.unit} → total{' '}
                    <span className="font-semibold text-gray-700">
                      {r.newTotal.toLocaleString()} {r.unit}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference + Date */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Reference / Invoice No. (optional)
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. INV-2026-0041"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-500 mb-1">Received Date</label>
          <input
            type="date"
            value={receiveDate}
            onChange={(e) => setReceiveDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value && expandedCategory === null) {
              setExpandedCategory(stockCategories[0]?.id ?? null);
            }
          }}
          placeholder="Search ingredients..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
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

      {/* Category sections */}
      <div className="space-y-3">
        {stockCategories.map((cat) => renderCategory(cat))}

        {/* Uncategorized */}
        {uncategorizedFiltered.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === '__uncategorized' ? null : '__uncategorized'
                )
              }
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-3">
                {expandedCategory === '__uncategorized' ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Uncategorized</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {uncategorizedFiltered.length} ingredient{uncategorizedFiltered.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {(() => {
                const n = uncategorizedFiltered.filter((i) => {
                  const v = packages[i.id] ?? '';
                  return v.trim() !== '' && parseFloat(v) > 0;
                }).length;
                return n > 0 ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                    {n} item{n !== 1 ? 's' : ''} queued
                  </span>
                ) : null;
              })()}
            </button>

            {expandedCategory === '__uncategorized' && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="min-w-full">
                  {tableHeader}
                  <tbody className="divide-y divide-gray-100">
                    {uncategorizedFiltered.map((ingredient, idx) =>
                      renderIngredientRow(ingredient, idx)
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {stockCategories.length === 0 && uncategorizedFiltered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No ingredients found
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between bg-white border-t border-gray-200 shadow-xl px-6 py-4">
        <div className="text-sm text-gray-500">
          {pendingCount === 0 ? (
            'Enter quantities in the Packages Received column to begin'
          ) : (
            <span>
              <span className="font-semibold text-gray-800">{pendingCount}</span>{' '}
              ingredient{pendingCount !== 1 ? 's' : ''} ready to receive
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={() => setPackages({})}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={pendingCount === 0 || submitStatus === 'submitting'}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitStatus === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Receiving...
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4" />
                Receive {pendingCount > 0 ? `${pendingCount} Item${pendingCount !== 1 ? 's' : ''}` : 'Stock'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
