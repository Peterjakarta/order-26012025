import type { Recipe, Ingredient } from '../types/types';

export function calculateRecipeCost(recipe: Recipe, ingredients: Ingredient[]): number {
  const recipeIngredientsCost = recipe.ingredients.reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;

    const unitPrice = Math.ceil(ingredient.price / ingredient.packageSize);
    return total + (unitPrice * Math.ceil(item.amount));
  }, 0);

  const shellIngredientsCost = (recipe.shellIngredients || []).reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;

    const unitPrice = Math.ceil(ingredient.price / ingredient.packageSize);
    return total + (unitPrice * Math.ceil(item.amount));
  }, 0);

  return recipeIngredientsCost + shellIngredientsCost;
}

export function calculateIngredientUsage(recipes: Recipe[], quantity: number): Record<string, number> {
  const usage: Record<string, number> = {};

  recipes.forEach(recipe => {
    const scale = quantity / recipe.yield;

    recipe.ingredients.forEach(item => {
      const amount = Math.ceil(item.amount * scale);
      usage[item.ingredientId] = (usage[item.ingredientId] || 0) + amount;
    });

    (recipe.shellIngredients || []).forEach(item => {
      const amount = Math.ceil(item.amount * scale);
      usage[item.ingredientId] = (usage[item.ingredientId] || 0) + amount;
    });
  });

  return usage;
}

// Calculate selling price with margin and optional tax
export function calculateSellPrice(
  cost: number, 
  marginPercentage: number = 30, 
  includeTax: boolean = false,
  taxPercentage: number = 10
): number {
  // Calculate base price with margin
  // Formula: cost / (1 - marginPercentage/100)
  const basePrice = cost / (1 - (marginPercentage / 100));
  
  // Apply tax if requested
  if (includeTax) {
    return basePrice * (1 + (taxPercentage / 100));
  }
  
  return basePrice;
}

// Calculate total production cost including reject percentage
export function calculateTotalProductionCost(
  baseCost: number,
  laborCost: number = 0,
  packagingCost: number = 0,
  equipmentCost: number = 0,
  rejectPercentage: number = 0
): number {
  const productionCost = baseCost + laborCost + packagingCost + equipmentCost;
  const rejectCost = productionCost * (rejectPercentage / 100);
  return productionCost + rejectCost;
}