import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Recipe } from '../../../types/types';
import RecipeForm from './RecipeForm';
import RecipeCalculator from './RecipeCalculator';
import { formatIDR } from '../../../utils/currencyFormatter';

export default function RecipeManagement() {
  const { recipes, categories, addRecipe, updateRecipe, deleteRecipe } = useStore();
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [calculatingRecipe, setCalculatingRecipe] = useState<Recipe | null>(null);
  const [copyingRecipe, setCopyingRecipe] = useState<Recipe | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [justCopiedIngredients, setJustCopiedIngredients] = useState<string | null>(null);

  const handleSubmit = async (data: Omit<Recipe, 'id'>) => {
    try {
      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, data);
        setEditingRecipe(null);
      } else if (copyingRecipe) {
        await addRecipe(data);
        setCopyingRecipe(null);
      } else {
        await addRecipe(data);
        setIsAddingRecipe(false);
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe. Please try again.');
    }
  };

  const handleCopyRecipe = (recipe: Recipe) => {
    setCopyingRecipe({
      ...recipe,
      name: `${recipe.name} (Copy)`,
      description: recipe.description || '',
      notes: recipe.notes || ''
    });
    
    setJustCopied(recipe.id);
    setTimeout(() => setJustCopied(null), 2000);
  };

  const handleCopyIngredients = (recipe: Recipe) => {
    try {
      // Format ingredients for copying
      const ingredientText = recipe.ingredients.map(item => 
        `${item.ingredientId}|${item.amount}`
      ).join('\n');

      navigator.clipboard.writeText(ingredientText);
      
      setJustCopiedIngredients(recipe.id);
      setTimeout(() => setJustCopiedIngredients(null), 2000);
    } catch (err) {
      console.error('Error copying ingredients:', err);
      alert('Failed to copy ingredients to clipboard');
    }
  };

  // Group recipes by category
  const recipesByCategory = Object.entries(categories).reduce((acc, [categoryId, categoryData]) => {
    const categoryRecipes = recipes.filter(recipe => recipe.category === categoryId);
    if (categoryRecipes.length > 0) {
      acc[categoryId] = {
        name: categoryData.name,
        recipes: categoryRecipes
      };
    }
    return acc;
  }, {} as Record<string, { name: string; recipes: Recipe[] }>);

  const handleToggleRecipe = (recipeId: string) => {
    setExpandedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recipes</h2>
        <button
          onClick={() => setIsAddingRecipe(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" />
          Add Recipe
        </button>
      </div>

      {isAddingRecipe && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">New Recipe</h3>
          <RecipeForm
            recipe={null}
            onSubmit={handleSubmit}
            onCancel={() => setIsAddingRecipe(false)}
          />
        </div>
      )}

      {copyingRecipe && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Copy Recipe</h3>
          <RecipeForm
            recipe={copyingRecipe}
            onSubmit={handleSubmit}
            onCancel={() => setCopyingRecipe(null)}
            isEditing={false}
          />
        </div>
      )}

      {calculatingRecipe && (
        <RecipeCalculator
          recipe={calculatingRecipe}
          onClose={() => setCalculatingRecipe(null)}
        />
      )}

      <div className="space-y-2">
        {Object.entries(recipesByCategory).map(([categoryId, { name, recipes }]) => {
          const isExpanded = expandedCategory === categoryId;
          const categoryKey = `category-${categoryId}`;
          
          return (
            <div key={categoryKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
                className="w-full px-4 py-3 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{name}</h3>
                    <p className="text-sm text-gray-500">{recipes.length} recipes</p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t divide-y">
                  {recipes.map(recipe => (
                    <div key={`recipe-${recipe.id}`}>
                      {editingRecipe?.id === recipe.id ? (
                        <div className="p-4">
                          <h3 className="text-lg font-medium mb-3">Edit Recipe</h3>
                          <RecipeForm
                            recipe={recipe}
                            onSubmit={handleSubmit}
                            onCancel={() => setEditingRecipe(null)}
                            isEditing={true}
                          />
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{recipe.name}</h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span>Yield: {recipe.yield} {recipe.yieldUnit}</span>
                                {recipe.laborCost && (
                                  <span>Labor: {formatIDR(recipe.laborCost)}</span>
                                )}
                                {recipe.packagingCost && (
                                  <span>Packaging: {formatIDR(recipe.packagingCost)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setCalculatingRecipe(recipe)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <Calculator className="w-4 h-4" />
                                Calculate
                              </button>
                              <button
                                onClick={() => handleCopyIngredients(recipe)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <Copy className="w-4 h-4" />
                                {justCopiedIngredients === recipe.id ? 'Ingredients Copied!' : 'Copy Ingredients'}
                              </button>
                              <button
                                onClick={() => handleCopyRecipe(recipe)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <Copy className="w-4 h-4" />
                                {justCopied === recipe.id ? 'Copied!' : 'Copy'}
                              </button>
                              <button
                                onClick={() => setEditingRecipe(recipe)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => deleteRecipe(recipe.id)}
                                className="flex items-center gap-2 px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}