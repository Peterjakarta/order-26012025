import type { Recipe, Ingredient } from '../types/types';

export function calculateRecipeCost(recipe: Recipe, ingredients: Ingredient[]): number {
  return recipe.ingredients.reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;

    // Calculate cost based on the amount used (unit price * amount)
    const unitPrice = ingredient.price / ingredient.packageSize;
    return total + (unitPrice * item.amount);
  }, 0);
}

export function calculateIngredientUsage(recipes: Recipe[], quantity: number): Record<string, number> {
  const usage: Record<string, number> = {};

  recipes.forEach(recipe => {
    const scale = quantity / recipe.yield;
    
    recipe.ingredients.forEach(item => {
      const amount = item.amount * scale;
      usage[item.ingredientId] = (usage[item.ingredientId] || 0) + amount;
    });
  });

  return usage;
}