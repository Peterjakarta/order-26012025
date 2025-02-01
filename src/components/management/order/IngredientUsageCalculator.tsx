import React, { useState } from 'react';
import { Calculator, FileDown, X, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { Order, Recipe, Ingredient } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import { generateIngredientUsagePDF } from '../../../utils/pdfGenerator';
import { branches } from '../../../data/branches';

interface IngredientUsageCalculatorProps {
  selectedOrders: Order[];
  onClose: () => void;
}

interface IngredientUsage {
  amount: number;
  cost: number;
}

interface ProductUsage {
  name: string;
  quantity: number;
  producedQuantity: number;
  unit: string;
  recipe?: Recipe;
}

export default function IngredientUsageCalculator({ 
  selectedOrders, 
  onClose 
}: IngredientUsageCalculatorProps) {
  const { recipes, ingredients, products } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [showProducts, setShowProducts] = useState(true);

  // Group orders by branch
  const ordersByBranch = selectedOrders.reduce((acc, order) => {
    const branchId = order.branchId;
    if (!acc[branchId]) {
      acc[branchId] = [];
    }
    acc[branchId].push({
      completedAt: order.completedAt,
      products: order.products
    });
    return acc;
  }, {} as Record<string, { completedAt: string; products: OrderItem[] }[]>);

  // Track products and their usage
  const productUsage: ProductUsage[] = [];
  const productsWithoutRecipes = new Set<string>();

  // Calculate ingredient usage across all selected orders
  const ingredientUsage = selectedOrders.reduce((acc, order) => {
    order.products.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      const recipe = recipes.find(r => r.productId === item.productId);

      // Track product usage
      productUsage.push({
        name: product.name,
        quantity: item.quantity,
        producedQuantity: item.producedQuantity || item.quantity,
        unit: product.unit || 'pcs',
        recipe: recipe
      });

      if (!recipe) {
        productsWithoutRecipes.add(product.name);
        return;
      }

      // Calculate scaling factor based on produced quantity
      const scale = (item.producedQuantity || item.quantity) / recipe.yield;

      // Add up ingredients
      recipe.ingredients.forEach(ingredient => {
        const ingredientData = ingredients.find(i => i.id === ingredient.ingredientId);
        if (!ingredientData) return;

        const amount = Math.ceil(ingredient.amount * scale);
        if (!acc[ingredient.ingredientId]) {
          acc[ingredient.ingredientId] = { amount: 0, cost: 0 };
        }
        
        // Calculate cost based on unit price and amount used
        const unitPrice = Math.ceil(ingredientData.price / ingredientData.packageSize);
        const cost = unitPrice * amount;
        
        acc[ingredient.ingredientId].amount += amount;
        acc[ingredient.ingredientId].cost += cost;
      });
    });
    return acc;
  }, {} as Record<string, IngredientUsage>);

  // Calculate total cost
  const totalCost = Object.values(ingredientUsage).reduce((sum, usage) => sum + usage.cost, 0);

  // Calculate total amount for ingredients with the same unit
  const ingredientTotalsByUnit = Object.entries(ingredientUsage).reduce((acc, [ingredientId, usage]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return acc;
    
    if (!acc[ingredient.unit]) {
      acc[ingredient.unit] = 0;
    }
    acc[ingredient.unit] += usage.amount;
    return acc;
  }, {} as Record<string, number>);

  // Check for missing recipes after calculation
  React.useEffect(() => {
    if (productsWithoutRecipes.size > 0) {
      const productNames = Array.from(productsWithoutRecipes).join(', ');
      setError(`Missing recipes for: ${productNames}`);
    }
  }, [productsWithoutRecipes.size]);

  const handleDownloadExcel = () => {
    try {
      // Group orders by branch for the summary
      const branchSummary = Object.entries(ordersByBranch).map(([branchId, orders]) => {
        const branch = branches.find(b => b.id === branchId);
        return [
          branch?.name || 'Unknown Branch',
          orders.map(order => 
            `Completed: ${new Date(order.completedAt).toLocaleDateString()}`
          ).join(', ')
        ];
      });

      const data = [
        ['Ingredient Usage Summary'],
        [''],
        ['Branch Summary:'],
        ...branchSummary,
        [''],
        ['Products'],
        ['Product', 'Ordered', 'Produced', 'Unit', 'Has Recipe'],
        ...productUsage.map(usage => [
          usage.name,
          usage.quantity,
          usage.producedQuantity,
          usage.unit,
          usage.recipe ? 'Yes' : 'No'
        ]),
        [''],
        ['Ingredients'],
        ['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Total Cost'],
        ...Object.entries(ingredientUsage).map(([ingredientId, usage]) => {
          const ingredient = ingredients.find(i => i.id === ingredientId);
          if (!ingredient) return [];
          const unitPrice = ingredient.price / ingredient.packageSize;
          return [
            ingredient.name,
            Math.ceil(usage.amount),
            ingredient.unit,
            formatIDR(unitPrice),
            formatIDR(usage.cost)
          ];
        }).filter(row => row.length > 0),
        [''],
        ['Total Cost:', formatIDR(totalCost)]
      ];

      const wb = generateExcelData(data, 'Ingredient Usage');
      saveWorkbook(wb, 'ingredient-usage.xlsx');
    } catch (err) {
      console.error('Error generating Excel:', err);
      setError('Failed to generate Excel file. Please try again.');
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = generateIngredientUsagePDF({
        orders: selectedOrders,
        branchSummary: Object.entries(ordersByBranch).map(([branchId, orders]) => {
          const branch = branches.find(b => b.id === branchId);
          return {
            branchName: branch?.name || 'Unknown Branch',
            completionDates: orders.map(order => order.completedAt)
          };
        }),
        products: productUsage,
        ingredients: Object.entries(ingredientUsage).map(([ingredientId, usage]) => {
          const ingredient = ingredients.find(i => i.id === ingredientId);
          if (!ingredient) return null;
          const unitPrice = ingredient.price / ingredient.packageSize;
          return {
            name: ingredient.name,
            amount: usage.amount,
            unit: ingredient.unit,
            unitPrice,
            cost: usage.cost
          };
        }).filter(Boolean),
        totalCost
      });
      
      doc.save('ingredient-usage.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF file. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">Ingredient Usage Calculator</h2>
            <p className="text-sm text-gray-600">
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Orders Summary */}
            <div className="space-y-4">
              <h3 className="font-medium">Selected Orders</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {Object.entries(ordersByBranch).map(([branchId, orders]) => {
                  const branch = branches.find(b => b.id === branchId);
                  if (!branch) return null;

                  return (
                    <div key={branchId} className="space-y-2">
                      <h4 className="font-medium text-gray-900">{branch.name}</h4>
                      <div className="text-sm text-gray-600">
                        {orders.map((order, index) => (
                          <div key={index}>
                            Completed: {new Date(order.completedAt).toLocaleDateString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Products</h3>
                <button
                  onClick={() => setShowProducts(!showProducts)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {showProducts ? 'Hide' : 'Show'} Products
                </button>
              </div>

              {showProducts && (
                <div className="bg-gray-50 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4">Product</th>
                        <th className="text-right py-3 px-4">Ordered</th>
                        <th className="text-right py-3 px-4">Produced</th>
                        <th className="text-left py-3 px-4">Unit</th>
                        <th className="text-center py-3 px-4">Has Recipe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productUsage.map((usage, index) => (
                        <tr key={index} className={!usage.recipe ? 'bg-red-50' : ''}>
                          <td className="py-3 px-4">
                            <span className="font-medium">{usage.name}</span>
                          </td>
                          <td className="text-right py-3 px-4">
                            {usage.quantity}
                          </td>
                          <td className="text-right py-3 px-4">
                            {usage.producedQuantity}
                          </td>
                          <td className="text-left py-3 px-4">
                            {usage.unit}
                          </td>
                          <td className="text-center py-3 px-4">
                            {usage.recipe ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-red-600">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ingredients Section */}
            <div className="space-y-4">
              <h3 className="font-medium">Ingredients</h3>
              {Object.keys(ingredientUsage).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4">Ingredient</th>
                        <th className="text-right py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Unit</th>
                        <th className="text-right py-3 px-4">Unit Price</th>
                        <th className="text-right py-3 px-4">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.entries(ingredientUsage).map(([ingredientId, usage]) => {
                        const ingredient = ingredients.find(i => i.id === ingredientId);
                        if (!ingredient) return null;

                        const unitPrice = ingredient.price / ingredient.packageSize;

                        return (
                          <tr key={ingredientId}>
                            <td className="py-3 px-4">
                              <span className="font-medium">{ingredient.name}</span>
                            </td>
                            <td className="text-right py-3 px-4 whitespace-nowrap">
                              {Math.ceil(usage.amount)}
                            </td>
                            <td className="text-left py-3 px-4 whitespace-nowrap">
                              {ingredient.unit}
                            </td>
                            <td className="text-right py-3 px-4 whitespace-nowrap">
                              {formatIDR(unitPrice)}/{ingredient.unit}
                            </td>
                            <td className="text-right py-3 px-4 font-medium">
                              {formatIDR(usage.cost)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Add totals by unit */}
                      {Object.entries(ingredientTotalsByUnit).map(([unit, total]) => (
                        <tr key={`total-${unit}`} className="bg-gray-50 font-medium">
                          <td className="py-3 px-4 text-right">
                            Total {unit}:
                          </td>
                          <td className="py-3 px-4 text-right">
                            {Math.ceil(total)}
                          </td>
                          <td className="py-3 px-4">
                            {unit}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      ))}
                      {/* Cost total row */}
                      <tr className="bg-gray-50 font-medium">
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
              ) : !error && (
                <div className="text-center py-8 text-gray-500">
                  No ingredient usage data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={handleDownloadExcel}
            disabled={Object.keys(ingredientUsage).length === 0 || !!error}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={Object.keys(ingredientUsage).length === 0 || !!error}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
            title="Download PDF"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}