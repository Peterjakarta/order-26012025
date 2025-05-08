import React, { useState, useEffect } from 'react';
import { Calculator, X, Percent, AlertCircle, RefreshCw, DollarSign, Info } from 'lucide-react';
import type { Recipe } from '../../../types/types';
import { formatIDR } from '../../../utils/currencyFormatter';
import { calculateRecipeCost, calculateTotalProductionCost } from '../../../utils/recipeCalculations';
import { calculateRecipeWeight, applyWeightBasedCosts, loadGlobalCostRates } from '../../../utils/recipeWeightCalculations';
import GlobalCostRates from './GlobalCostRates';

interface BatchCostUpdateProps {
  recipes: Recipe[];
  ingredients: any[];
  onUpdate: (recipeUpdates: Record<string, Partial<Recipe>>) => Promise<void>;
  onClose: () => void;
}

export default function BatchCostUpdate({ 
  recipes, 
  ingredients,
  onUpdate,
  onClose
}: BatchCostUpdateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalTaxPercentage, setGlobalTaxPercentage] = useState<number | undefined>();
  const [globalMarginPercentage, setGlobalMarginPercentage] = useState<number | undefined>();
  const [globalRejectPercentage, setGlobalRejectPercentage] = useState<number | undefined>();
  const [globalLaborCost, setGlobalLaborCost] = useState<number | undefined>();
  const [globalPackagingCost, setGlobalPackagingCost] = useState<number | undefined>();
  const [globalEquipmentCost, setGlobalEquipmentCost] = useState<number | undefined>();
  const [updates, setUpdates] = useState<Record<string, Partial<Recipe>>>({});
  const [applyGlobalValues, setApplyGlobalValues] = useState(false);
  const [showGlobalCostRates, setShowGlobalCostRates] = useState(false);
  const [applyWeightBasedCalculation, setApplyWeightBasedCalculation] = useState(true); // Default to true now

  // Initialize updates with current recipe values
  useEffect(() => {
    const initialUpdates: Record<string, Partial<Recipe>> = {};
    recipes.forEach(recipe => {
      initialUpdates[recipe.id] = {
        laborCost: recipe.laborCost,
        packagingCost: recipe.packagingCost,
        equipmentCost: recipe.equipmentCost,
        rejectPercentage: recipe.rejectPercentage,
        taxPercentage: recipe.taxPercentage,
        marginPercentage: recipe.marginPercentage
      };
    });
    setUpdates(initialUpdates);
    
    // Auto-apply weight-based calculations on initialization
    if (applyWeightBasedCalculation) {
      applyWeightBasedCalculationToAll();
    }
  }, [recipes]);

  const handleInputChange = (recipeId: string, field: keyof Recipe, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    
    setUpdates(prev => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        [field]: numValue
      }
    }));
  };

  const handleApplyGlobalValues = () => {
    if (applyGlobalValues) {
      const newUpdates = { ...updates };
      
      recipes.forEach(recipe => {
        newUpdates[recipe.id] = {
          ...newUpdates[recipe.id],
          taxPercentage: globalTaxPercentage,
          marginPercentage: globalMarginPercentage,
          rejectPercentage: globalRejectPercentage,
          laborCost: globalLaborCost,
          packagingCost: globalPackagingCost,
          equipmentCost: globalEquipmentCost
        };
      });
      
      setUpdates(newUpdates);
    }
  };

  // Apply global values when checkbox is toggled or global values change
  useEffect(() => {
    if (applyGlobalValues) {
      handleApplyGlobalValues();
    }
  }, [
    applyGlobalValues, 
    globalTaxPercentage, 
    globalMarginPercentage, 
    globalRejectPercentage, 
    globalLaborCost, 
    globalPackagingCost, 
    globalEquipmentCost
  ]);

  const applyWeightBasedCalculationToAll = () => {
    const globalRates = loadGlobalCostRates();
    const newUpdates = { ...updates };
    
    recipes.forEach(recipe => {
      // Calculate weight-based costs for this recipe
      const weightBasedUpdates = applyWeightBasedCosts(recipe, ingredients, globalRates);
      
      newUpdates[recipe.id] = {
        ...newUpdates[recipe.id],
        ...weightBasedUpdates
      };
    });
    
    setUpdates(newUpdates);
  };

  // Apply weight-based calculation when toggled or after global rates are updated
  useEffect(() => {
    if (applyWeightBasedCalculation) {
      applyWeightBasedCalculationToAll();
    }
  }, [applyWeightBasedCalculation]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If weight-based calculation is enabled, apply it one last time before submission
      if (applyWeightBasedCalculation) {
        applyWeightBasedCalculationToAll();
      }
      
      // Small delay to ensure state updates are processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Sanitize updates to handle undefined values - convert them to null
      // This ensures Firebase won't reject them as invalid
      const sanitizedUpdates: Record<string, Partial<Recipe>> = {};
      
      for (const [recipeId, update] of Object.entries(updates)) {
        // Only include fields that have a value (non-undefined)
        // For undefined values, set them to null which Firebase can handle
        const sanitizedUpdate: Partial<Recipe> = {};
        for (const [key, value] of Object.entries(update)) {
          sanitizedUpdate[key as keyof Recipe] = value === undefined ? null : value;
        }
        
        // Only include recipes that have updates
        if (Object.keys(sanitizedUpdate).length > 0) {
          sanitizedUpdates[recipeId] = sanitizedUpdate;
        }
      }
      
      await onUpdate(sanitizedUpdates);
      onClose();
    } catch (err) {
      console.error('Error updating recipes:', err);
      setError(err instanceof Error ? err.message : 'Failed to update recipes');
    } finally {
      setLoading(false);
    }
  };

  // Calculate base costs to display
  const getBaseCost = (recipe: Recipe) => {
    return calculateRecipeCost(recipe, ingredients);
  };
  
  // Handler for when global cost rates are updated
  const handleGlobalCostRatesSave = () => {
    setShowGlobalCostRates(false);
    
    // Re-apply weight-based calculation with new rates if enabled
    if (applyWeightBasedCalculation) {
      setTimeout(() => applyWeightBasedCalculationToAll(), 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-pink-600" />
            <h2 className="text-xl font-semibold">Update Recipe Costs</h2>
            <span className="bg-pink-100 text-pink-800 text-sm px-2.5 py-0.5 rounded-full">
              {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {showGlobalCostRates ? (
            <div>
              <GlobalCostRates 
                onSave={handleGlobalCostRatesSave}
                onClose={() => setShowGlobalCostRates(false)} 
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowGlobalCostRates(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Back to Batch Update
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-4">
                <h3 className="font-medium text-blue-800 mb-3 text-lg">Global Settings</h3>

                <div className="mb-4 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="applyGlobalValues"
                      checked={applyGlobalValues}
                      onChange={(e) => setApplyGlobalValues(e.target.checked)}
                      className="mr-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <label htmlFor="applyGlobalValues" className="text-sm font-medium">
                      Apply these values to all selected recipes
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="applyWeightBased"
                      checked={applyWeightBasedCalculation}
                      onChange={(e) => {
                        setApplyWeightBasedCalculation(e.target.checked);
                        // If enabled, apply immediately
                        if (e.target.checked) {
                          setTimeout(() => applyWeightBasedCalculationToAll(), 100);
                        }
                      }}
                      className="mr-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <label htmlFor="applyWeightBased" className="text-sm font-medium">
                      Use weight-based cost calculation
                    </label>
                  </div>

                  <button
                    onClick={() => setShowGlobalCostRates(true)}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Configure Cost Rates
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* First section: Cost Percentages */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-blue-700 border-b pb-1 border-blue-200">Percentages</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Percentage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={globalTaxPercentage ?? ''}
                          onChange={(e) => setGlobalTaxPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={!applyGlobalValues}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="e.g. 10%"
                        />
                        <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Margin Percentage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={globalMarginPercentage ?? ''}
                          onChange={(e) => setGlobalMarginPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={!applyGlobalValues}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="e.g. 30%"
                        />
                        <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reject Percentage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={globalRejectPercentage ?? ''}
                          onChange={(e) => setGlobalRejectPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={!applyGlobalValues}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="e.g. 5%"
                        />
                        <Percent className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Second section: Costs */}
                  <div className="space-y-4 col-span-2">
                    <h4 className="font-medium text-sm text-blue-700 border-b pb-1 border-blue-200">Additional Costs</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Labor Cost (IDR)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={globalLaborCost ?? ''}
                            onChange={(e) => setGlobalLaborCost(e.target.value ? parseFloat(e.target.value) : undefined)}
                            min="0"
                            step="1000"
                            disabled={!applyGlobalValues || applyWeightBasedCalculation}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="e.g. 25000"
                          />
                          <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {applyWeightBasedCalculation && (
                          <p className="text-xs text-purple-600 mt-1">
                            Using weight-based calculation
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Electricity (IDR)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={globalPackagingCost ?? ''}
                            onChange={(e) => setGlobalPackagingCost(e.target.value ? parseFloat(e.target.value) : undefined)}
                            min="0"
                            step="1000"
                            disabled={!applyGlobalValues || applyWeightBasedCalculation}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="e.g. 15000"
                          />
                          <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {applyWeightBasedCalculation && (
                          <p className="text-xs text-purple-600 mt-1">
                            Using weight-based calculation
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment Cost (IDR)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={globalEquipmentCost ?? ''}
                            onChange={(e) => setGlobalEquipmentCost(e.target.value ? parseFloat(e.target.value) : undefined)}
                            min="0"
                            step="1000"
                            disabled={!applyGlobalValues || applyWeightBasedCalculation}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="e.g. 10000"
                          />
                          <DollarSign className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                        </div>
                        {applyWeightBasedCalculation && (
                          <p className="text-xs text-purple-600 mt-1">
                            Using weight-based calculation
                          </p>
                        )}
                      </div>
                    </div>

                    {applyWeightBasedCalculation && (
                      <div className="mt-2 bg-purple-50 p-3 rounded-lg border border-purple-100 text-sm text-purple-800">
                        <p>Weight-based calculation is active. Labor, Electricity, and Equipment costs will be calculated based on recipe weight and global cost rates.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipe</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Base Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Labor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Electricity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reject %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipes.map(recipe => {
                      const baseCost = getBaseCost(recipe);
                      const recipeUpdates = updates[recipe.id] || {};
                      const recipeWeight = calculateRecipeWeight(recipe, ingredients);
                      
                      return (
                        <tr key={recipe.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-normal">
                            <div className="font-medium">{recipe.name}</div>
                            <div className="text-xs text-gray-500">
                              Yield: {recipe.yield} {recipe.yieldUnit}
                            </div>
                            {applyWeightBasedCalculation && (
                              <div className="text-xs text-purple-600">
                                Weight: {recipeWeight.toFixed(0)} grams
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatIDR(baseCost)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={recipeUpdates.laborCost ?? ''}
                              onChange={(e) => handleInputChange(recipe.id, 'laborCost', e.target.value)}
                              min="0"
                              step="1000"
                              disabled={applyWeightBasedCalculation}
                              className="w-28 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right disabled:bg-gray-100 disabled:text-gray-500"
                              placeholder="Labor cost"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={recipeUpdates.packagingCost ?? ''}
                              onChange={(e) => handleInputChange(recipe.id, 'packagingCost', e.target.value)}
                              min="0"
                              step="1000"
                              disabled={applyWeightBasedCalculation}
                              className="w-28 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right disabled:bg-gray-100 disabled:text-gray-500"
                              placeholder="Electricity cost"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={recipeUpdates.equipmentCost ?? ''}
                              onChange={(e) => handleInputChange(recipe.id, 'equipmentCost', e.target.value)}
                              min="0"
                              step="1000"
                              disabled={applyWeightBasedCalculation}
                              className="w-28 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right disabled:bg-gray-100 disabled:text-gray-500"
                              placeholder="Equipment cost"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative">
                              <input
                                type="number"
                                value={recipeUpdates.rejectPercentage ?? ''}
                                onChange={(e) => handleInputChange(recipe.id, 'rejectPercentage', e.target.value)}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right pr-7"
                                placeholder="e.g. 5"
                              />
                              <Percent className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative">
                              <input
                                type="number"
                                value={recipeUpdates.taxPercentage ?? ''}
                                onChange={(e) => handleInputChange(recipe.id, 'taxPercentage', e.target.value)}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right pr-7"
                                placeholder="e.g. 10"
                              />
                              <Percent className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative">
                              <input
                                type="number"
                                value={recipeUpdates.marginPercentage ?? ''}
                                onChange={(e) => handleInputChange(recipe.id, 'marginPercentage', e.target.value)}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1.5 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-right pr-7"
                                placeholder="e.g. 30"
                              />
                              <Percent className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                Update Recipe Costs
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}