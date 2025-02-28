import React, { useState } from 'react';
import { History, Search, Filter, X, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { formatDate } from '../../../utils/dateUtils';
import { formatIDR } from '../../../utils/currencyFormatter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import type { StockHistory } from '../../../types/types';

interface StockHistoryProps {
  ingredientId?: string;
  onClose?: () => void;
}

export default function StockHistory({ ingredientId, onClose }: StockHistoryProps) {
  const { ingredients, getStockHistory, stockHistory: cachedHistory } = useStore();
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    changeType: '' as '' | 'reduction' | 'reversion' | 'manual'
  });

  // Load history on mount
  React.useEffect(() => {
    loadHistory();
  }, [ingredientId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use cached history initially to prevent UI freezing
      if (ingredientId) {
        setHistory(cachedHistory.filter(item => item.ingredientId === ingredientId));
      } else {
        setHistory(cachedHistory);
      }
      
      // Then load fresh data
      try {
        const historyData = await getStockHistory(ingredientId);
        setHistory(historyData);
      } catch (err) {
        console.error('Error loading stock history:', err);
        // We already set initial data from cache, so we don't set error here
        // Just log it to avoid disrupting the user experience
      }
    } catch (err) {
      console.error('Error in loadHistory:', err);
      setError('Failed to load stock history. Using cached data.');
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'reduction': return 'Stock Reduction';
      case 'reversion': return 'Stock Reversion';
      case 'manual': return 'Manual Update';
      default: return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'reduction': return 'text-red-600 bg-red-50';
      case 'reversion': return 'text-blue-600 bg-blue-50';
      case 'manual': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredHistory = history.filter(entry => {
    if (filters.changeType && entry.changeType !== filters.changeType) {
      return false;
    }
    if (filters.startDate && new Date(entry.timestamp) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && new Date(entry.timestamp) > new Date(filters.endDate)) {
      return false;
    }
    return true;
  });

  const handleDownloadExcel = () => {
    try {
      // Prepare data for Excel
      const data = [
        ['Stock History Report'],
        ['Generated:', new Date().toLocaleString()],
        ingredientId ? [
          'Ingredient:',
          ingredients.find(i => i.id === ingredientId)?.name || 'Unknown'
        ] : [],
        ['Filters:'],
        ['Change Type:', filters.changeType || 'All'],
        ['Start Date:', filters.startDate || 'None'],
        ['End Date:', filters.endDate || 'None'],
        [''],
        ['Timestamp', 'Ingredient', 'Previous', 'New', 'Change', 'Type', 'Unit'],
        ...filteredHistory.map(entry => {
          const ingredient = ingredients.find(i => i.id === entry.ingredientId);
          if (!ingredient) return [];
          
          return [
            new Date(entry.timestamp).toLocaleString(),
            ingredient.name,
            entry.previousQuantity,
            entry.newQuantity,
            entry.changeAmount,
            getChangeTypeLabel(entry.changeType),
            ingredient.unit
          ];
        }).filter(row => row.length > 0)
      ].filter(row => row.length > 0);

      const wb = generateExcelData(data, 'Stock History');
      saveWorkbook(wb, 'stock-history.xlsx');
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Stock History</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel
          </button>
          {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <h3 className="font-medium">Filters</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Type
            </label>
            <select
              value={filters.changeType}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                changeType: e.target.value as typeof filters.changeType 
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">All Types</option>
              <option value="reduction">Stock Reduction</option>
              <option value="reversion">Stock Reversion</option>
              <option value="manual">Manual Update</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setFilters({ startDate: '', endDate: '', changeType: '' })}
            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
          >
            Reset
          </button>
          <button
            onClick={loadHistory}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Search className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No stock history found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left py-3 px-4">Timestamp</th>
                  <th className="text-left py-3 px-4">Ingredient</th>
                  <th className="text-right py-3 px-4">Previous</th>
                  <th className="text-right py-3 px-4">New</th>
                  <th className="text-right py-3 px-4">Change</th>
                  <th className="text-left py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.map(entry => {
                  const ingredient = ingredients.find(i => i.id === entry.ingredientId);
                  if (!ingredient) return null;

                  return (
                    <tr key={entry.id}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(entry.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{ingredient.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {entry.previousQuantity} {ingredient.unit}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {entry.newQuantity} {ingredient.unit}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={entry.changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.changeAmount >= 0 ? '+' : ''}{entry.changeAmount} {ingredient.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${getChangeTypeColor(entry.changeType)}`}
                        >
                          {getChangeTypeLabel(entry.changeType)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}