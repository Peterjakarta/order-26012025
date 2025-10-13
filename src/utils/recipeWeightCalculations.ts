import { Recipe, Ingredient } from '../types/types';

// Default global cost rates (per gram)
export const DEFAULT_COST_RATES = {
  laborCostPerGram: 10, // IDR per gram
  electricityCostPerGram: 5, // IDR per gram
  equipmentCostPerGram: 2, // IDR per gram
};

// Calculate total recipe weight in grams
export function calculateRecipeWeight(recipe: Recipe, ingredients: Ingredient[]): number {
  const recipeIngredientsWeight = recipe.ingredients.reduce((totalWeight, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return totalWeight;

    return totalWeight + item.amount;
  }, 0);

  const shellIngredientsWeight = (recipe.shellIngredients || []).reduce((totalWeight, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return totalWeight;

    return totalWeight + item.amount;
  }, 0);

  return recipeIngredientsWeight + shellIngredientsWeight;
}

// Calculate overhead costs based on recipe weight
export function calculateOverheadCosts(
  recipeWeight: number,
  costRates: {
    laborCostPerGram?: number;
    electricityCostPerGram?: number;
    equipmentCostPerGram?: number;
  } = DEFAULT_COST_RATES
): {
  laborCost: number;
  electricityCost: number;
  equipmentCost: number;
} {
  // Ensure the recipe weight is valid
  const weight = Math.max(0, recipeWeight);
  
  // Calculate costs based on weight
  const laborCost = Math.ceil((costRates.laborCostPerGram || DEFAULT_COST_RATES.laborCostPerGram) * weight);
  const electricityCost = Math.ceil((costRates.electricityCostPerGram || DEFAULT_COST_RATES.electricityCostPerGram) * weight);
  const equipmentCost = Math.ceil((costRates.equipmentCostPerGram || DEFAULT_COST_RATES.equipmentCostPerGram) * weight);
  
  return {
    laborCost,
    electricityCost,
    equipmentCost
  };
}

// Apply weight-based calculations to a recipe
export function applyWeightBasedCosts(
  recipe: Recipe, 
  ingredients: Ingredient[],
  costRates?: {
    laborCostPerGram?: number;
    electricityCostPerGram?: number;
    equipmentCostPerGram?: number;
  }
): Partial<Recipe> {
  // Calculate the total weight
  const recipeWeight = calculateRecipeWeight(recipe, ingredients);
  
  // Calculate overhead costs
  const overheadCosts = calculateOverheadCosts(recipeWeight, costRates);
  
  // Return updated recipe values
  return {
    laborCost: overheadCosts.laborCost,
    packagingCost: overheadCosts.electricityCost, // packagingCost field stores electricity cost
    equipmentCost: overheadCosts.equipmentCost
  };
}

// Save global cost rates to localStorage
export function saveGlobalCostRates(costRates: {
  laborCostPerGram: number;
  electricityCostPerGram: number;
  equipmentCostPerGram: number;
}): void {
  localStorage.setItem('globalCostRates', JSON.stringify(costRates));
}

// Load global cost rates from localStorage
export function loadGlobalCostRates(): {
  laborCostPerGram: number;
  electricityCostPerGram: number;
  equipmentCostPerGram: number;
} {
  try {
    const savedRates = localStorage.getItem('globalCostRates');
    if (savedRates) {
      return JSON.parse(savedRates);
    }
  } catch (err) {
    console.error('Error loading global cost rates:', err);
  }
  return DEFAULT_COST_RATES;
}