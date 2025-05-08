import React, { useState, useEffect } from 'react';
import { X, FileDown, FileSpreadsheet, Copy, Check, Info } from 'lucide-react';
import type { Recipe } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { calculateRecipeCost, calculateTotalProductionCost, calculateSellPrice } from '../../../utils/recipeCalculations';
import { calculateRecipeWeight, applyWeightBasedCosts, loadGlobalCostRates } from '../../../utils/recipeWeightCalculations';
import { formatIDR } from '../../../utils/currencyFormatter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import { generateRecipePDF } from '../../../utils/pdfGenerator';

export interface RecipeCalculatorProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeCalculator({ recipe, onClose }: RecipeCalculatorProps) {
  const { ingredients } = useStore();
  const [quantity, setQuantity] = useState(recipe.yield);
  const [copied, setCopied] = useState(false);
  const [useWeightBasedCalculation, setUseWeightBasedCalculation] = useState(true);
  const [overheadCosts, setOverheadCosts] = useState({
    laborCost: recipe.laborCost || 0,
    electricityCost: recipe.packagingCost || 0,
    equipmentCost: recipe.equipmentCost || 0
  });
  
  // Calculate recipe weight
  const recipeWeight = calculateRecipeWeight(recipe, ingredients);
  
  // Calculate base cost (ingredients only)
  const baseCost = calculateRecipeCost(recipe, ingredients);
  const scaledBaseCost = (baseCost / recipe.yield) * quantity;
  
  // Load global cost rates
  useEffect(() => {
    if (useWeightBasedCalculation) {
      const scaledWeight = (recipeWeight / recipe.yield) * quantity;
      const globalRates = loadGlobalCostRates();
      const weightBasedCosts = applyWeightBasedCosts(
        { ...recipe, yield: quantity },
        ingredients, 
        globalRates
      );
      
      setOverheadCosts({
        laborCost: weightBasedCosts.laborCost || 0,
        electricityCost: weightBasedCosts.packagingCost || 0,
        equipmentCost: weightBasedCosts.equipmentCost || 0
      });
    } else {
      // Use manual costs
      setOverheadCosts({
        laborCost: recipe.laborCost ? (recipe.laborCost / recipe.yield) * quantity : 0,
        electricityCost: recipe.packagingCost ? (recipe.packagingCost / recipe.yield) * quantity : 0,
        equipmentCost: recipe.equipmentCost ? (recipe.equipmentCost / recipe.yield) * quantity : 0
      });
    }
  }, [recipe, quantity, useWeightBasedCalculation, ingredients, recipeWeight]);
  
  // Additional costs
  const laborCost = overheadCosts.laborCost;
  const packagingCost = overheadCosts.electricityCost;
  const equipmentCost = overheadCosts.equipmentCost;
  
  // Production cost (before reject adjustment)
  const productionCost = scaledBaseCost + laborCost + packagingCost + equipmentCost;
  
  // Reject cost (if applicable)
  const rejectPercentage = recipe.rejectPercentage || 0;
  const rejectCost = productionCost * (rejectPercentage / 100);
  
  // Total production cost with reject adjustment
  const totalProductionCost = productionCost + rejectCost;
  
  // Cost per unit
  const costPerUnit = totalProductionCost / quantity;
  
  // Selling price calculation
  const marginPercentage = recipe.marginPercentage || 30; // Default 30%
  const taxPercentage = recipe.taxPercentage || 10; // Default 10%
  
  // Calculate selling price without tax
  const baseSellingPrice = calculateSellPrice(costPerUnit, marginPercentage, false);
  
  // Calculate selling price with tax
  const sellingPriceWithTax = calculateSellPrice(costPerUnit, marginPercentage, true, taxPercentage);
  
  // Calculate total weight and find the common unit
  const { totalWeight, commonUnit } = recipe.ingredients.reduce((acc, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return acc;
    
    const scaledAmount = (item.amount / recipe.yield) * quantity;
    
    // If we haven't set a common unit yet, use this ingredient's unit
    if (!acc.commonUnit) {
      acc.commonUnit = ingredient.unit;
    }
    
    // Only add to total if units match
    if (ingredient.unit === acc.commonUnit) {
      acc.totalWeight += scaledAmount;
    }
    
    return acc;
  }, { totalWeight: 0, commonUnit: '' as string });

  // Calculate ingredient usage with unit prices
  const ingredientUsage = recipe.ingredients.map(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return null;

    const scaledAmount = (item.amount / recipe.yield) * quantity;
    const unitPrice = ingredient.price / ingredient.packageSize;
    const cost = unitPrice * scaledAmount;

    return {
      ingredient,
      amount: scaledAmount,
      unitPrice,
      cost
    };
  }).filter(Boolean);

  const handleDownloadExcel = () => {
    const data = [
      ['Recipe Cost Calculator'],
      [''],
      ['Recipe:', recipe.name],
      ['Quantity:', `${quantity} ${recipe.yieldUnit}`], // Use current quantity
      ['Total Weight:', `${totalWeight.toFixed(2)} ${commonUnit}`], 
      [''],
      ['Ingredients'],
      ['Name', 'Amount', 'Unit', 'Unit Price', 'Cost'],
      ...ingredientUsage.map(usage => usage && [
        usage.ingredient.name,
        usage.amount.toFixed(2), // This is already scaled based on the current quantity
        usage.ingredient.unit,
        formatIDR(usage.unitPrice),
        formatIDR(usage.cost)
      ]),
      [''],
      ['Production Costs'],
      ['Base Ingredient Cost:', formatIDR(scaledBaseCost)],
      ['Labor Cost:', formatIDR(laborCost)],
      ['Electricity:', formatIDR(packagingCost)],
      ['Equipment Cost:', formatIDR(equipmentCost)],
      [`Reject Cost (${rejectPercentage}%):`, formatIDR(rejectCost)],
      ['Total Production Cost:', formatIDR(totalProductionCost)],
      ['Cost per Unit:', formatIDR(costPerUnit)],
      [''],
      ['Pricing'],
      [`Margin (${marginPercentage}%):`, formatIDR(baseSellingPrice - costPerUnit)],
      ['Selling Price (before tax):', formatIDR(baseSellingPrice)],
      [`Tax (${taxPercentage}%):`, formatIDR(sellingPriceWithTax - baseSellingPrice)],
      ['Selling Price (with tax):', formatIDR(sellingPriceWithTax)],
      ['Rounded Selling Price:', formatIDR(Math.ceil(sellingPriceWithTax / 1000) * 1000)]
    ].filter(row => row.length > 0);

    const wb = generateExcelData(data, 'Recipe Calculator');
    saveWorkbook(wb, `recipe-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  const handleDownloadPDF = () => {
    // Pass the current quantity to the PDF generator
    const doc = generateRecipePDF(recipe, ingredients, quantity);
    doc.save(`recipe-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const handleCopyIngredients = () => {
    try {
      // Format ingredients for copying with the scaled amounts based on current quantity
      const ingredientText = recipe.ingredients.map(item => {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        if (!ingredient) return null;
        
        // Scale the ingredient amount according to the current quantity
        const scaledAmount = (item.amount / recipe.yield) * quantity;
        
        return `${ingredient.id}|${Math.ceil(scaledAmount)}`;
      }).filter(Boolean).join('\n');

      // Copy to clipboard
      navigator.clipboard.writeText(ingredientText);
      
      // Show success state
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying ingredients:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">{recipe.name}</h2>
            <p className="text-sm text-gray-600">Cost Calculator</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production Quantity ({recipe.yieldUnit})
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                min="0"
                step="1"
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Recipe Weight
              </label>
              <div className="flex items-center h-10">
                <span className="px-3 py-2 border rounded-md bg-gray-50 font-medium">
                  {(recipeWeight / recipe.yield * quantity).toFixed(0)} grams
                </span>
              </div>
            </div>
            
            <div className="flex-1">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <input
                  type="checkbox"
                  checked={useWeightBasedCalculation}
                  onChange={(e) => setUseWeightBasedCalculation(e.target.checked)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                Weight-Based Costs
              </label>
              <div className="text-xs text-gray-500">
                {useWeightBasedCalculation ? (
                  <span className="text-purple-600">Using global cost rates per gram</span>
                ) : (
                  <span>Using manual cost values</span>
                )}
              </div>
            </div>
          </div>
          
          {useWeightBasedCalculation && (
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">Weight-Based Calculation Active</p>
                  <p>Labor, Electricity, and Equipment costs are calculated automatically based on:</p>
                  <ul className="list-disc ml-5 mt-1">
                    <li>Recipe weight: {(recipeWeight / recipe.yield * quantity).toFixed(0)} grams</li>
                    <li>Global cost rates: per-gram rates defined in settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Ingredient Usage & Costs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Ingredient</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-left pl-4">Unit</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ingredientUsage.map((usage, index) => usage && (
                    <tr key={`${recipe.id}-ingredient-${usage.ingredient.id}-${index}`}>
                      <td className="py-3 px-4">
                        <span className="font-medium">{usage.ingredient.name}</span>
                      </td>
                      <td className="text-right py-3 px-4 whitespace-nowrap">
                        {Math.ceil(usage.amount)}
                      </td>
                      <td className="text-left py-3 px-4 whitespace-nowrap">
                        {usage.ingredient.unit}
                      </td>
                      <td className="text-right py-3 px-4 whitespace-nowrap">
                        {formatIDR(usage.unitPrice)}/{usage.ingredient.unit}
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatIDR(usage.cost)}
                      </td>
                    </tr>
                  ))}
                  {commonUnit && (
                    <tr key={`${recipe.id}-unit-total-${commonUnit}`} className="bg-gray-50 font-medium">
                      <td className="py-3 px-4 text-right">
                        Total {commonUnit}:
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Math.ceil(totalWeight)}
                      </td>
                      <td className="py-3 px-4">
                        {commonUnit}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                  <tr key={`${recipe.id}-final-total-cost`} className="bg-gray-50 font-medium">
                    <td colSpan={4} className="py-3 px-4 text-right">
                      Total Ingredient Cost:
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatIDR(scaledBaseCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium border-b pb-2">Production Costs</h4>
              <div className="flex justify-between text-sm">
                <span>Base Ingredient Cost:</span>
                <span>{formatIDR(scaledBaseCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Labor Cost:</span>
                <span>{formatIDR(laborCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Electricity:</span>
                <span>{formatIDR(packagingCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Equipment Cost:</span>
                <span>{formatIDR(equipmentCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reject Cost ({rejectPercentage}%):</span>
                <span>{formatIDR(rejectCost)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Production Cost:</span>
                <span>{formatIDR(totalProductionCost)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Cost per {recipe.yieldUnit}:</span>
                <span>{formatIDR(costPerUnit)}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium border-b pb-2">Pricing</h4>
              <div className="flex justify-between text-sm">
                <span>Cost per {recipe.yieldUnit}:</span>
                <span>{formatIDR(costPerUnit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Margin ({marginPercentage}%):</span>
                <span>{formatIDR(baseSellingPrice - costPerUnit)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Selling Price (before tax):</span>
                <span>{formatIDR(baseSellingPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxPercentage}%):</span>
                <span>{formatIDR(sellingPriceWithTax - baseSellingPrice)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t text-pink-600">
                <span>Selling Price (with tax):</span>
                <span>{formatIDR(sellingPriceWithTax)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Rounded Selling Price:</span>
                <span>{formatIDR(Math.ceil(sellingPriceWithTax / 1000) * 1000)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={handleCopyIngredients}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Ingredients
              </>
            )}
          </button>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}