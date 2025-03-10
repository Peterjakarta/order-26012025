import React, { useState } from 'react';
import { X, FileDown, FileSpreadsheet, Copy, Check } from 'lucide-react';
import type { Recipe } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { calculateRecipeCost } from '../../../utils/recipeCalculations';
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
  
  const baseCost = calculateRecipeCost(recipe, ingredients);
  const scaledCost = (baseCost / recipe.yield) * quantity;
  
  const laborCost = recipe.laborCost ? (recipe.laborCost / recipe.yield) * quantity : 0;
  const packagingCost = recipe.packagingCost ? (recipe.packagingCost / recipe.yield) * quantity : 0;
  
  const totalCost = scaledCost + laborCost + packagingCost;
  const costPerUnit = totalCost / quantity;

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
      commonUnit ? ['Total Weight:', `${totalWeight.toFixed(2)} ${commonUnit}`] : [],
      [''],
      ['Costs'],
      ['Base Cost:', formatIDR(scaledCost)],
      ['Labor Cost:', formatIDR(laborCost)],
      ['Packaging Cost:', formatIDR(packagingCost)],
      ['Total Cost:', formatIDR(totalCost)],
      ['Cost per Unit:', formatIDR(costPerUnit)]
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
          <div>
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
                      Total Cost:
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatIDR(totalCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Base Cost:</span>
              <span>{formatIDR(scaledCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Labor Cost:</span>
              <span>{formatIDR(laborCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Packaging Cost:</span>
              <span>{formatIDR(packagingCost)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total Cost:</span>
              <span>{formatIDR(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Cost per {recipe.yieldUnit}:</span>
              <span>{formatIDR(costPerUnit)}</span>
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