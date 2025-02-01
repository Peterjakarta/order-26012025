import React, { useState } from 'react';
import { Package2, Plus, Edit2, AlertCircle, Save, X, History, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import StockHistory from './StockHistory';

interface StockEntry {
  ingredientId: string;
  quantity: number;
  minStock?: number;
}

export default function IngredientStock() {
  const { ingredients, stockLevels, updateStockLevel } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [minStockInput, setMinStockInput] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  const handleDownloadExcel = () => {
    try {
      // Prepare data for Excel
      const data = [
        ['Ingredient Stock Levels'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Ingredient', 'Current Stock', 'Unit', 'Min Stock', 'Package Size', 'Package Unit', 'Unit Cost'],
        ...ingredients.map(ingredient => {
          const stockData = stockLevels[ingredient.id] || {};
          const currentStock = stockData.quantity || 0;
          const minStock = stockData.minStock;
          
          return [
            ingredient.name,
            currentStock,
            ingredient.unit,
            minStock || '-',
            ingredient.packageSize,
            ingredient.packageUnit,
            formatIDR(ingredient.price)
          ];
        })
      ];

      const wb = generateExcelData(data, 'Stock Levels');
      saveWorkbook(wb, 'ingredient-stock.xlsx');
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file. Please try again.');
    }
  };

  const handleUpdateStock = async (ingredientId: string, quantity: number, minStock?: number) => {
    try {
      const stockData = stockLevels[ingredientId] || {};
      await updateStockLevel(ingredientId, {
        quantity: Math.max(0, quantity),
        minStock: minStock ?? stockData.minStock // Preserve existing minStock if not provided
      });
    } catch (err) {
      setError('Failed to update stock level. Please try again.');
      console.error('Error updating stock:', err);
    }
  };

  const handleMinStockSubmit = async (ingredientId: string) => {
    try {
      const value = parseInt(minStockInput);
      const stockData = stockLevels[ingredientId] || {};
      if (isNaN(value) || value < 0) {
        setError('Please enter a valid minimum stock level');
        return;
      }
      
      try {
        await updateStockLevel(ingredientId, {
          quantity: stockData.quantity || 0,
          minStock: value
        });
        setEditingMinStock(null);
        setMinStockInput('');
        setError(null);
      } catch (err) {
        console.error('Error updating min stock:', err);
        setError('Failed to update minimum stock level');
      }
    } catch (err) {
      setError('Failed to update minimum stock level. Please try again.');
      console.error('Error updating min stock:', err);
    }
  };

  const getLowStockWarning = (ingredient: Ingredient, quantity: number) => {
    const stockData = stockLevels[ingredient.id] || {};
    const minStock = stockData.minStock;
    
    if (minStock !== undefined && quantity <= minStock) {
      return `Low stock - Below minimum (${minStock} ${ingredient.unit})`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Ingredient Stock</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <History className="w-4 h-4" />
            View History
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4">Ingredient</th>
                <th className="text-left py-3 px-4">Current Stock</th>
                <th className="text-left py-3 px-4">Min Stock</th>
                <th className="text-left py-3 px-4">Package Size</th>
                <th className="text-left py-3 px-4">Unit Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ingredients.map(ingredient => {
                const stockData = stockLevels[ingredient.id] || {};
                const currentStock = stockData.quantity || 0;
                const minStock = stockData.minStock;
                const warning = getLowStockWarning(ingredient, stockData.quantity || 0);

                return (
                  <tr key={ingredient.id} className={warning ? 'bg-yellow-50' : ''}>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium">{ingredient.name}</span>
                        {warning && (
                          <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                            <AlertCircle className="w-4 h-4" />
                            {warning}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={currentStock || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              handleUpdateStock(ingredient.id, value, minStock);
                              setError(null);
                            }
                          }}
                          min="0"
                          step="0.01"
                          className={`w-24 px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500
                            ${warning ? 'border-red-300 bg-red-50' : ''}`}
                        />
                        <span className="text-gray-500">{ingredient.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {editingMinStock === ingredient.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={minStockInput}
                            onChange={(e) => setMinStockInput(e.target.value)}
                            min="0"
                            className="w-24 px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Enter min"
                          />
                          <button
                            onClick={() => handleMinStockSubmit(ingredient.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMinStock(null);
                              setMinStockInput('');
                            }}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>
                            {minStock !== undefined ? `${minStock} ${ingredient.unit}` : '-'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingMinStock(ingredient.id);
                              setMinStockInput(minStock?.toString() || '');
                            }}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIngredient(ingredient.id);
                              setShowHistory(true);
                            }}
                            className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                            title="View history"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {ingredient.packageSize} {ingredient.packageUnit}
                    </td>
                    <td className="py-3 px-4">
                      {formatIDR(ingredient.price)} / {ingredient.packageUnit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Stock History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <StockHistory 
                ingredientId={selectedIngredient || undefined}
                onClose={() => {
                  setShowHistory(false);
                  setSelectedIngredient(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}