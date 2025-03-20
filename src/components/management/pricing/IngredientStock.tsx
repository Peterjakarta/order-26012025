import React, { useState, useEffect } from 'react';
import { Package2, Plus, Edit2, AlertCircle, Save, X, History, FileSpreadsheet, ChevronDown, ChevronRight, ClipboardList, Upload, RefreshCw } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { getNetworkStatus } from '../../../lib/firebase';
import { formatIDR } from '../../../utils/currencyFormatter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import { generateStockChecklistPDF } from '../../../utils/pdfGenerator';
import StockHistory from './StockHistory';
import StockCategories from './StockCategories';
import BulkStockImport from './BulkStockImport';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { COLLECTIONS } from '../../../lib/firebase';

export default function IngredientStock() {
  const { ingredients, stockLevels, updateStockLevel, stockCategories, updateIngredientCategories } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [minStockInput, setMinStockInput] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [localStockLevels, setLocalStockLevels] = useState<Record<string, number>>({});
  const [categoryIngredients, setCategoryIngredients] = useState<Record<string, string[]>>({});
  const [editingStock, setEditingStock] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({});
  const [lastSaveTime, setLastSaveTime] = useState<Record<string, number>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<StockCategory | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize local stock levels from Firestore data
  useEffect(() => {
    const initialLevels: Record<string, number> = {};
    
    // Initialize stock levels for all ingredients
    ingredients.forEach(ingredient => {
      const stockData = stockLevels[ingredient.id] || { quantity: 0 };
      initialLevels[ingredient.id] = stockData.quantity;
    });
    
    setLocalStockLevels(initialLevels);
    setIsInitialized(true);
  }, [ingredients, stockLevels]);

  // Load category-ingredient relationships
  useEffect(() => {
    const loadCategoryIngredients = async () => {
      try {
        const q = query(collection(db, COLLECTIONS.STOCK_CATEGORY_ITEMS));
        const snapshot = await getDocs(q);
        
        const categoryMap: Record<string, string[]> = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          const categoryId = data.category_id;
          const ingredientId = data.ingredient_id;
          
          if (!categoryMap[categoryId]) {
            categoryMap[categoryId] = [];
          }
          categoryMap[categoryId].push(ingredientId);
        });
        
        setCategoryIngredients(categoryMap);
      } catch (err) {
        console.error('Error loading category ingredients:', err);
        setError('Failed to load category ingredients');
      }
    };

    loadCategoryIngredients();
  }, []);

  const debouncedUpdate = useDebounce(async (
    ingredientId: string,
    quantity: number,
    minStock?: number,
    retryCount = 0
  ) => {
    try {
      if (!getNetworkStatus()) {
        throw new Error('No network connection');
      }

      // Validate ingredient exists
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      await updateStockLevel(ingredientId, {
        quantity: Math.max(0, quantity),
        minStock,
        changeType: 'manual'
      });

      setSaving(prev => {
        const next = new Set(prev);
        next.delete(ingredientId);
        return next;
      });
      
      // Clear any existing error
      setError(null);

    } catch (err) {
      const isNetworkError = err instanceof Error && 
        (err.message.includes('network') || err.message.includes('offline'));

      if (isNetworkError && retryCount < 3) {
        // Retry after delay for network errors
        setTimeout(() => {
          debouncedUpdate(ingredientId, quantity, minStock, retryCount + 1);
        }, 2000 * Math.pow(2, retryCount)); // Exponential backoff
        
        setError('Network error - retrying update...');
      } else {
        console.error('Error updating stock:', {
          ingredientId,
          quantity,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        
        setError(
          isNetworkError
            ? 'Network error - changes will sync when online'
            : 'Failed to update stock level. Please try again.'
        );
      }
    }
  }, 1000);

  const handleDownloadExcel = () => {
    try {
      // Prepare header rows
      const data = [
        ['Ingredient Stock Levels'],
        ['Generated:', new Date().toLocaleString()],
        ['']
      ];

      // Process each category
      stockCategories.forEach(category => {
        // Get ingredients for this category from the categoryIngredients state
        const categoryIngredientsList = ingredients.filter(ingredient => 
          (categoryIngredients[category.id] || []).includes(ingredient.id)
        );

        if (categoryIngredientsList.length > 0) {
          // Add category header
          data.push(
            [''],
            [category.name],
            ['Ingredient', 'Current Stock', 'Unit', 'Min Stock', 'Package Size', 'Package Unit', 'Unit Cost']
          );

          // Add ingredients
          categoryIngredientsList.forEach(ingredient => {
            const stockData = stockLevels[ingredient.id] || {};
            const currentStock = stockData.quantity || 0;
            const minStock = stockData.minStock;
            
            data.push([
              ingredient.name,
              currentStock,
              ingredient.unit,
              minStock || '-',
              ingredient.packageSize,
              ingredient.packageUnit,
              formatIDR(ingredient.price)
            ]);
          });

          // Add category summary
          const totalStock = categoryIngredientsList.reduce((sum, ingredient) => {
            const stockData = stockLevels[ingredient.id] || {};
            return sum + (stockData.quantity || 0);
          }, 0);

          data.push(
            [''],
            [`Total ${category.name} Stock:`, totalStock]
          );
        }
      });

      // Add uncategorized ingredients if any exist
      const uncategorizedIngredients = ingredients.filter(ingredient => 
        !Object.values(categoryIngredients).some(cats => cats.includes(ingredient.id))
      );

      if (uncategorizedIngredients.length > 0) {
        data.push(
          [''],
          ['Uncategorized Ingredients'],
          ['Ingredient', 'Current Stock', 'Unit', 'Min Stock', 'Package Size', 'Package Unit', 'Unit Cost']
        );

        uncategorizedIngredients.forEach(ingredient => {
          const stockData = stockLevels[ingredient.id] || {};
          const currentStock = stockData.quantity || 0;
          const minStock = stockData.minStock;
          
          data.push([
            ingredient.name,
            currentStock,
            ingredient.unit,
            minStock || '-',
            ingredient.packageSize,
            ingredient.packageUnit,
            formatIDR(ingredient.price)
          ]);
        });
      }
      
      // Generate and save Excel file
      const wb = generateExcelData(data, 'Stock Levels');
      saveWorkbook(wb, 'ingredient-stock.xlsx');
      setError(null); // Clear any existing errors

    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file. Please try again.');
    }
  };

  const handleDownloadChecklist = () => {
    try {
      // Generate checklist data by category
      const checklistData = stockCategories.map(category => {
        // Get ingredients for this category
        const categoryIngredientsList = ingredients.filter(ingredient => 
          (categoryIngredients[category.id] || []).includes(ingredient.id)
        );

        return {
          categoryName: category.name,
          ingredients: categoryIngredientsList.map(ingredient => {
            const stockData = stockLevels[ingredient.id] || {};
            return {
              name: ingredient.name,
              currentStock: stockData.quantity || 0,
              unit: ingredient.unit,
              minStock: stockData.minStock,
              packageSize: ingredient.packageSize,
              packageUnit: ingredient.packageUnit
            };
          })
        };
      });

      // Add uncategorized ingredients if any exist
      const uncategorizedIngredients = ingredients.filter(ingredient => 
        !Object.values(categoryIngredients).some(cats => cats.includes(ingredient.id))
      );

      if (uncategorizedIngredients.length > 0) {
        checklistData.push({
          categoryName: 'Uncategorized',
          ingredients: uncategorizedIngredients.map(ingredient => {
            const stockData = stockLevels[ingredient.id] || {};
            return {
              name: ingredient.name,
              currentStock: stockData.quantity || 0,
              unit: ingredient.unit,
              minStock: stockData.minStock,
              packageSize: ingredient.packageSize,
              packageUnit: ingredient.packageUnit
            };
          })
        });
      }

      // Generate and save PDF
      const doc = generateStockChecklistPDF(checklistData);
      doc.save('stock-checklist.pdf');
      setError(null);
    } catch (err) {
      console.error('Error generating checklist PDF:', err);
      setError('Failed to generate checklist PDF. Please try again.');
    }
  };

  const handleUpdateStock = (ingredientId: string, quantity: number) => {
    const now = Date.now();
    const lastSave = lastSaveTime[ingredientId] || 0;
    const timeSinceLastSave = now - lastSave;
    const currentStock = stockLevels[ingredientId]?.quantity || 0;
    const MAX_QUANTITY = 9999999; // Add maximum quantity limit

    // Validate quantity
    if (quantity > MAX_QUANTITY) {
      setError(`Maximum quantity allowed is ${MAX_QUANTITY}`);
      return;
    }

    // Update local state immediately
    setLocalStockLevels(prev => ({
      ...prev,
      [ingredientId]: quantity
    }));

    // Skip update if value hasn't changed or is invalid
    if (quantity === currentStock || quantity < 0 || !Number.isFinite(quantity)) {
      return;
    }

    // Add to pending updates
    setPendingUpdates(prev => ({
      ...prev,
      [ingredientId]: quantity
    }));

    // Only show editing UI if we haven't saved recently
    if (timeSinceLastSave > 1000) { // Reduced debounce time
      setEditingStock(prev => {
        const next = new Set(prev);
        next.add(ingredientId);
        return next;
      });
    }
  };

  const handleSaveStock = async (ingredientId: string) => {
    try {
      // Check network status
      if (!getNetworkStatus()) {
        setError('Cannot save while offline. Changes will sync when online.');
        return;
      }

      const quantity = pendingUpdates[ingredientId] ?? localStockLevels[ingredientId];
      const currentStock = stockLevels[ingredientId]?.quantity || 0;
      
      // Skip if no change
      if (quantity === currentStock) {
        setEditingStock(prev => {
          const next = new Set(prev);
          next.delete(ingredientId);
          return next;
        });
        return;
      }
      
      // Input validation with better error messages
      if (!Number.isFinite(quantity)) {
        setError('Please enter a valid number');
        return;
      }
      
      if (quantity < 0) {
        setError('Quantity cannot be negative');
        return;
      }

      // Mark as saving
      setSaving(prev => {
        const next = new Set(prev);
        next.add(ingredientId);
        return next;
      });

      // Clear editing state
      setEditingStock(prev => {
        const next = new Set(prev);
        next.delete(ingredientId);
        return next;
      });

      // Update last save time
      setLastSaveTime(prev => ({
        ...prev,
        [ingredientId]: Date.now()
      }));

      // Remove from pending updates
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[ingredientId];
        return next;
      });

      // Clear any existing error
      setError(null);

      // Update stock level
      await updateStockLevel(ingredientId, {
        quantity,
        minStock: stockLevels[ingredientId]?.minStock,
        changeType: 'manual'
      });

    } catch (err) {
      console.error('Error saving stock:', err);
      setError('Failed to save stock level. Please try again.');
      
      // Remove from saving state on error
      setSaving(prev => {
        const next = new Set(prev);
        next.delete(ingredientId);
        return next;
      });
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

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading stock levels...</div>
      </div>
    );
  }

  if (ingredients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-gray-500">No ingredients found.</div>
        <div className="text-sm text-gray-400">
          Add ingredients in the Ingredients section to manage stock levels.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Ingredient Stock</h2>
          {isRefreshing && (
            <span className="text-sm text-gray-500 flex items-center ml-2">
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              Refreshing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownloadChecklist()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <ClipboardList className="w-4 h-4" />
            Download Checklist
          </button>
          <button
            onClick={() => handleDownloadExcel()}
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

      <div className="space-y-2">
        {stockCategories.map(category => {
          const categoryIngredientIds = categoryIngredients[category.id] || [];
          const filteredIngredients = ingredients.filter(ingredient => 
            categoryIngredientIds.includes(ingredient.id)
          );

          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id} className="bg-white rounded-lg shadow-sm border">
              <div className="flex justify-between items-center px-4 py-3">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 -ml-2 rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {filteredIngredients.length} ingredients
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowBulkImport(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Import
                </button>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingredient
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Stock
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Min Stock
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Package Size
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Cost
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredIngredients.map(ingredient => {
                          const stockData = stockLevels[ingredient.id] || {};
                          const currentStock = stockData.quantity || 0;
                          const minStock = stockData.minStock;
                          const warning = getLowStockWarning(ingredient, stockData.quantity || 0);

                          return (
                            <tr
                              key={ingredient.id}
                              className={`${warning ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {ingredient.name}
                                    </div>
                                    {warning && (
                                      <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {warning}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={(localStockLevels[ingredient.id] ?? currentStock) || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value);
                                      if (!isNaN(value) && value >= 0) {
                                        handleUpdateStock(ingredient.id, value);
                                      }
                                    }}
                                    min="0"
                                    step="1"
                                    className={`w-24 px-2 py-1 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                                      warning ? 'border-red-300 bg-red-50' : ''
                                    }`}
                                    title="Enter stock quantity"
                                    maxLength={10}
                                    style={{ appearance: 'textfield' }}
                                  />
                                  <span className="text-sm text-gray-500">{ingredient.unit}</span>
                                  {editingStock.has(ingredient.id) && (
                                    <button
                                      onClick={() => handleSaveStock(ingredient.id)}
                                      disabled={saving.has(ingredient.id)}
                                      className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center gap-1"
                                    >
                                      <Save className="w-3 h-3" />
                                      {saving.has(ingredient.id) ? 'Saving...' : 'Save'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
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
                                  <span className="text-sm text-gray-900">
                                    {minStock !== undefined ? `${minStock} ${ingredient.unit}` : '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ingredient.packageSize} {ingredient.packageUnit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatIDR(ingredient.price)} / {ingredient.packageUnit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedIngredient(ingredient.id);
                                      setShowHistory(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    title="View history"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMinStock(ingredient.id);
                                      setMinStockInput(minStock?.toString() || '');
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    title="Set minimum stock"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </div>
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
        })}
      </div>
      
      {/* Bulk Import Modal */}
      {showBulkImport && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <BulkStockImport
              category={selectedCategory}
              onClose={() => {
                setShowBulkImport(false);
                setSelectedCategory(null);
              }}
            />
          </div>
        </div>
      )}

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

      <div className="mt-8 pt-8 border-t">
        <StockCategories />
      </div>
    </div>
  );
}