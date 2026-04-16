import React from 'react';
import { X, Printer, ChefHat, AlertCircle } from 'lucide-react';
import type { Order, Product, Recipe, Ingredient } from '../../../types/types';
import { getBranchStyles } from '../../../utils/branchStyles';
import { useBranches } from '../../../hooks/useBranches';

interface ProductionIPadRecipesProps {
  order: Order;
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  onClose: () => void;
}

export default function ProductionIPadRecipes({ order, products, recipes, ingredients, onClose }: ProductionIPadRecipesProps) {
  const { branches } = useBranches();
  const branch = branches.find(b => b.id === order.branchId);
  const styles = getBranchStyles(order.branchId);

  const getScaledIngredients = (recipe: Recipe, quantity: number) => {
    return recipe.ingredients
      .map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        if (!ing) return null;
        const scaled = Math.ceil((ri.amount / recipe.yield) * quantity);
        return { name: ing.name, unit: ing.unit, amount: scaled };
      })
      .filter(Boolean) as { name: string; unit: string; amount: number }[];
  };

  const getScaledShellIngredients = (recipe: Recipe, quantity: number) => {
    if (!recipe.shellIngredients?.length) return [];
    return recipe.shellIngredients
      .map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        if (!ing) return null;
        const scaled = Math.ceil((ri.amount / recipe.yield) * quantity);
        return { name: ing.name, unit: ing.unit, amount: scaled };
      })
      .filter(Boolean) as { name: string; unit: string; amount: number }[];
  };

  const handlePrint = () => {
    const branchName = branch?.name || 'Unknown Branch';
    const delivery = new Date(order.deliveryDate).toLocaleDateString();
    const prodStart = order.productionStartDate ? new Date(order.productionStartDate).toLocaleDateString() : '';
    const prodEnd = order.productionEndDate ? new Date(order.productionEndDate).toLocaleDateString() : '';
    const prodRange = prodStart ? (prodEnd ? `${prodStart} – ${prodEnd}` : prodStart) : '';

    const cardsHtml = order.products.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return '';
      const recipe = recipes.find(r => r.productId === item.productId);

      let recipeHtml = '<p style="color:#9ca3af;font-style:italic;margin-top:8px;">No recipe available for this product.</p>';

      if (recipe) {
        const scaled = getScaledIngredients(recipe, item.quantity);
        const scaledShell = getScaledShellIngredients(recipe, item.quantity);

        const ingRows = scaled.map(ing =>
          `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${ing.name}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${ing.amount}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;color:#6b7280;">${ing.unit}</td></tr>`
        ).join('');

        const shellRows = scaledShell.map(ing =>
          `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${ing.name}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-weight:600;">${ing.amount}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;color:#6b7280;">${ing.unit}</td></tr>`
        ).join('');

        recipeHtml = `
          <p style="font-size:11px;color:#6b7280;margin-bottom:6px;">Yield: ${recipe.yield} ${recipe.yieldUnit} &nbsp;|&nbsp; Scaled for: ${item.quantity} ${product.unit}</p>
          ${scaled.length > 0 ? `
            ${scaledShell.length > 0 ? '<p style="font-size:12px;font-weight:600;margin-bottom:4px;color:#374151;">Filling / Ganache</p>' : ''}
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
              <thead><tr>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#db2777;color:#fff;text-align:left;font-size:11px;">Ingredient</th>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#db2777;color:#fff;text-align:center;font-size:11px;">Amount</th>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#db2777;color:#fff;text-align:left;font-size:11px;">Unit</th>
              </tr></thead>
              <tbody>${ingRows}</tbody>
            </table>` : ''}
          ${scaledShell.length > 0 ? `
            <p style="font-size:12px;font-weight:600;margin-bottom:4px;color:#374151;">Shell</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
              <thead><tr>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#9333ea;color:#fff;text-align:left;font-size:11px;">Ingredient</th>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#9333ea;color:#fff;text-align:center;font-size:11px;">Amount</th>
                <th style="padding:6px 8px;border:1px solid #e5e7eb;background:#9333ea;color:#fff;text-align:left;font-size:11px;">Unit</th>
              </tr></thead>
              <tbody>${shellRows}</tbody>
            </table>` : ''}
          ${recipe.notes ? `<p style="font-size:11px;color:#6b7280;background:#f9fafb;padding:8px;border-radius:4px;border-left:3px solid #db2777;"><strong>Notes:</strong> ${recipe.notes}</p>` : ''}
        `;
      }

      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
            <div>
              <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 2px;">${product.name}</h2>
              <span style="font-size:11px;color:#9ca3af;text-transform:capitalize;">${product.category}</span>
            </div>
            <span style="font-size:18px;font-weight:700;color:#db2777;">${item.quantity} <span style="font-size:12px;font-weight:400;color:#6b7280;">${product.unit}</span></span>
          </div>
          ${recipeHtml}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Recipes – ${branchName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { display: flex; gap: 20px; font-size: 11px; color: #555; margin-bottom: 20px; flex-wrap: wrap; }
        .meta span strong { color: #111; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>
      <h1>Production Recipes</h1>
      <div class="meta">
        <span><strong>Branch:</strong> ${branchName}</span>
        <span><strong>Order:</strong> #${order.id.slice(0, 8)}</span>
        <span><strong>Ordered by:</strong> ${order.orderedBy}</span>
        <span><strong>Delivery:</strong> ${delivery}</span>
        ${prodRange ? `<span><strong>Production:</strong> ${prodRange}</span>` : ''}
      </div>
      ${cardsHtml}
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b shadow-sm px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-pink-600" />
              <h1 className="text-lg font-bold text-gray-900">Production Recipes</h1>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${styles.base}`}>
              {branch?.name || 'Unknown Branch'}
            </span>
            <span className="text-sm text-gray-400">#{order.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {order.products.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;
            const recipe = recipes.find(r => r.productId === item.productId);
            const scaled = recipe ? getScaledIngredients(recipe, item.quantity) : [];
            const scaledShell = recipe ? getScaledShellIngredients(recipe, item.quantity) : [];

            return (
              <div key={item.productId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Product header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                    <span className="text-xs text-gray-400 capitalize">{product.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-pink-600">{item.quantity}</span>
                    <span className="text-sm text-gray-500 ml-1">{product.unit}</span>
                  </div>
                </div>

                {/* Recipe body */}
                <div className="px-5 py-4">
                  {!recipe ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">No recipe available for this product.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-gray-400">
                        Recipe yield: <span className="font-medium text-gray-600">{recipe.yield} {recipe.yieldUnit}</span>
                        &nbsp;&bull;&nbsp;
                        Scaled for: <span className="font-medium text-pink-600">{item.quantity} {product.unit}</span>
                      </p>

                      {scaled.length > 0 && (
                        <div>
                          {scaledShell.length > 0 && (
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filling / Ganache</p>
                          )}
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-pink-600 text-white">
                                <th className="text-left px-4 py-2.5 rounded-tl-lg font-semibold text-xs">Ingredient</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-xs w-28">Amount</th>
                                <th className="text-left px-4 py-2.5 rounded-tr-lg font-semibold text-xs w-24">Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scaled.map((ing, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-pink-50'}>
                                  <td className="px-4 py-3 font-medium text-gray-800">{ing.name}</td>
                                  <td className="px-4 py-3 text-center font-bold text-gray-900 text-base">{ing.amount}</td>
                                  <td className="px-4 py-3 text-gray-500">{ing.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {scaledShell.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shell</p>
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-700 text-white">
                                <th className="text-left px-4 py-2.5 rounded-tl-lg font-semibold text-xs">Ingredient</th>
                                <th className="text-center px-4 py-2.5 font-semibold text-xs w-28">Amount</th>
                                <th className="text-left px-4 py-2.5 rounded-tr-lg font-semibold text-xs w-24">Unit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scaledShell.map((ing, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-3 font-medium text-gray-800">{ing.name}</td>
                                  <td className="px-4 py-3 text-center font-bold text-gray-900 text-base">{ing.amount}</td>
                                  <td className="px-4 py-3 text-gray-500">{ing.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {recipe.notes && (
                        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
                          <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                          <p className="text-sm text-amber-800">{recipe.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t px-5 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>{order.products.length} product{order.products.length !== 1 ? 's' : ''}</span>
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
