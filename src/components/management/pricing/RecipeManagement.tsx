import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, Copy, ChevronDown, ChevronRight, Upload, Package2, Eye, EyeOff, FileSpreadsheet, Check, Clipboard } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Recipe, RecipeIngredient, Product } from '../../../types/types';
import RecipeForm from './RecipeForm';
import RecipeCalculator from './RecipeCalculator';
import { formatIDR } from '../../../utils/currencyFormatter';
import BulkIngredientImport from './recipe/BulkIngredientImport';
import ProductImport from './recipe/ProductImport';
import ProductToRecipeImport from './recipe/ProductToRecipeImport';
import ConfirmDialog from '../../common/ConfirmDialog';
import { generateSelectedRecipesExcel, saveWorkbook } from '../../../utils/excelGenerator';

export default function RecipeManagement() {
  const { recipes, categories, addRecipe, updateRecipe, deleteRecipe, products, ingredients, addIngredient } = useStore();
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [calculatingRecipe, setCalculatingRecipe] = useState<Recipe | null>(null);
  const [copyingRecipe, setCopyingRecipe] = useState<Recipe | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [justCopiedIngredients, setJustCopiedIngredients] = useState<string | null>(null);
  const [justPastedIngredients, setJustPastedIngredients] = useState<string | null>(null);
  const [showIngredientImport, setShowIngredientImport] = useState(false);
  const [showProductImport, setShowProductImport] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [showProductToRecipeImport, setShowProductToRecipeImport] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showPasteConfirmation, setShowPasteConfirmation] = useState(false);
  const [targetRecipeForPaste, setTargetRecipeForPaste] = useState<Recipe | null>(null);
  const [copiedIngredientsData, setCopiedIngredientsData] = useState<string>('');

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

  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await deleteRecipe(recipe.id);
      setRecipeToDelete(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
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
      setCopiedIngredientsData(ingredientText);
      
      setJustCopiedIngredients(recipe.id);
      setTimeout(() => setJustCopiedIngredients(null), 2000);
    } catch (err) {
      console.error('Error copying ingredients:', err);
      alert('Failed to copy ingredients to clipboard');
    }
  };

  const handlePasteIngredients = (recipe: Recipe) => {
    setTargetRecipeForPaste(recipe);
    
    // If we have copied ingredient data in state, use that
    if (copiedIngredientsData) {
      setShowPasteConfirmation(true);
    } else {
      // Otherwise, try to read from clipboard
      navigator.clipboard.readText()
        .then(text => {
          if (text && text.includes('|')) {
            setCopiedIngredientsData(text);
            setShowPasteConfirmation(true);
          } else {
            alert('No valid ingredient data found in clipboard. Please copy ingredients first.');
          }
        })
        .catch(err => {
          console.error('Error reading from clipboard:', err);
          alert('Unable to read from clipboard. Please ensure you have permission to access the clipboard.');
        });
    }
  };

  const confirmPasteIngredients = async () => {
    if (!targetRecipeForPaste || !copiedIngredientsData) return;
    
    try {
      // Parse the copied ingredients
      const lines = copiedIngredientsData.trim().split('\n');
      const newIngredients: RecipeIngredient[] = [];
      
      lines.forEach(line => {
        const [ingredientId, amount] = line.split('|');
        if (ingredientId && amount) {
          newIngredients.push({
            ingredientId,
            amount: parseFloat(amount)
          });
        }
      });
      
      if (newIngredients.length === 0) {
        alert('No valid ingredients found in copied data');
        return;
      }
      
      // Merge with existing ingredients, replacing any with the same ID
      const existingIds = new Set(targetRecipeForPaste.ingredients.map(i => i.ingredientId));
      const uniqueNewIngredients = newIngredients.filter(i => !existingIds.has(i.ingredientId));
      
      // Get all ingredients
      const updatedIngredients = [...targetRecipeForPaste.ingredients, ...uniqueNewIngredients];
      
      // Update the recipe
      await updateRecipe(targetRecipeForPaste.id, {
        ...targetRecipeForPaste,
        ingredients: updatedIngredients
      });
      
      setJustPastedIngredients(targetRecipeForPaste.id);
      setTimeout(() => setJustPastedIngredients(null), 2000);
      
      setShowPasteConfirmation(false);
      setTargetRecipeForPaste(null);
    } catch (err) {
      console.error('Error pasting ingredients:', err);
      alert('Failed to paste ingredients. Please try again.');
    }
  };

  const handleImportIngredients = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setShowIngredientImport(true);
  };
  
  const handleImportProducts = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setShowProductImport(true);
  };

  const handleAddIngredients = (newIngredients: RecipeIngredient[]) => {
    if (!currentRecipe) return;
    
    // Get existing ingredient IDs to avoid duplicates
    const existingIds = new Set(currentRecipe.ingredients.map(i => i.ingredientId));
    
    // Filter out any ingredients that already exist in the recipe
    const uniqueNewIngredients = newIngredients.filter(i => !existingIds.has(i.ingredientId));
    
    // Combine existing and new ingredients
    const updatedIngredients = [...currentRecipe.ingredients, ...uniqueNewIngredients];
    
    // Update the recipe
    updateRecipe(currentRecipe.id, {
      ...currentRecipe,
      ingredients: updatedIngredients
    });
    
    setShowIngredientImport(false);
    setShowProductImport(false);
    setCurrentRecipe(null);
  };

  const handleProductToRecipeImport = async (productsToImport: Product[]) => {
    // Create a new recipe for each selected product
    for (const product of productsToImport) {
      try {
        // Get the import info from session storage
        const importInfoString = sessionStorage.getItem('recipeImportInfo');
        const importInfo = importInfoString ? JSON.parse(importInfoString) : {
          createIngredients: [],
          matchingIngredients: {}
        };
        
        // Determine if we need to create a new ingredient or use an existing one
        const createIngredients = new Set(importInfo.createIngredients || []);
        const matchingIngredientIds = importInfo.matchingIngredients || {};
        
        // Default empty ingredients array
        let recipeIngredients: RecipeIngredient[] = [];
        
        // Add ingredient to the recipe (either create new or use existing)
        if (matchingIngredientIds[product.id]) {
          // Use existing ingredient
          const ingredientId = matchingIngredientIds[product.id];
          if (ingredientId) {
            recipeIngredients.push({ ingredientId, amount: 1 });
          }
        } 
        else if (createIngredients.has(product.id)) {
          // Create a new ingredient based on the product
          const newIngredientData = {
            name: product.name,
            unit: product.unit || 'pcs',
            packageSize: 1,
            packageUnit: product.unit || 'pcs',
            price: product.price || 0
          };
          
          // Add new ingredient and get its ID
          const newIngredientId = await addIngredient(newIngredientData);
          
          // Add to recipe ingredients
          if (newIngredientId) {
            recipeIngredients.push({ ingredientId: newIngredientId, amount: 1 });
          }
        }
        
        // Create basic recipe data
        const recipeData: Omit<Recipe, 'id'> = {
          name: product.name,
          description: product.description || '',
          category: product.category,
          productId: product.id,
          yield: 1,
          yieldUnit: product.unit || 'pcs',
          ingredients: recipeIngredients,
          // Optional fields can be added here
          notes: `Auto-created recipe for ${product.name}`
        };
        
        await addRecipe(recipeData);
      } catch (err) {
        console.error(`Error creating recipe for ${product.name}:`, err);
      }
    }
    
    sessionStorage.removeItem('recipeImportInfo');
    setShowProductToRecipeImport(false);
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    // Clear selections when toggling off
    if (selectMode) {
      setSelectedRecipes(new Set());
    }
  };

  const toggleSelectRecipe = (recipeId: string) => {
    setSelectedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleSelectAllInCategory = (categoryId: string, selected: boolean) => {
    const categoryRecipes = recipes.filter(recipe => recipe.category === categoryId);
    
    setSelectedRecipes(prev => {
      const next = new Set(prev);
      
      categoryRecipes.forEach(recipe => {
        if (selected) {
          next.add(recipe.id);
        } else {
          next.delete(recipe.id);
        }
      });
      
      return next;
    });
  };

  const handleBatchExport = async () => {
    try {
      setExportLoading(true);
      
      // If no recipes are selected, prompt the user
      if (selectedRecipes.size === 0) {
        const confirm = window.confirm('No recipes are selected. Do you want to export all recipes?');
        if (!confirm) {
          setExportLoading(false);
          return;
        }
        
        // Export all recipes
        const wb = generateSelectedRecipesExcel(recipes, recipes, products, ingredients, categories);
        saveWorkbook(wb, 'all-recipes.xlsx');
        setExportLoading(false);
        return;
      }
      
      // Get the selected recipes
      const recipesToExport = recipes.filter(recipe => selectedRecipes.has(recipe.id));
      
      // Export selected recipes
      const wb = generateSelectedRecipesExcel(recipesToExport, recipes, products, ingredients, categories);
      saveWorkbook(wb, `selected-recipes-${selectedRecipes.size}.xlsx`);
    } catch (error) {
      console.error('Error exporting recipes:', error);
      alert('Failed to export recipes. Please try again.');
    } finally {
      setExportLoading(false);
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
        <div className="flex gap-2">
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 px-4 py-2 border rounded-md ${selectMode ? 'bg-pink-50 border-pink-300 text-pink-600' : 'hover:bg-gray-50'}`}
          >
            <Check className="w-4 h-4" />
            {selectMode ? `Selected: ${selectedRecipes.size}` : 'Select Recipes'}
          </button>
          {selectMode && (
            <button
              onClick={handleBatchExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exportLoading ? 'Exporting...' : 'Export Selected'}
            </button>
          )}
          {!selectMode && (
            <>
              <button
                onClick={() => setShowProductToRecipeImport(true)}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                <Package2 className="w-4 h-4" />
                Import from Products
              </button>
              <button
                onClick={() => setIsAddingRecipe(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                <Plus className="w-4 h-4" />
                Add Recipe
              </button>
            </>
          )}
        </div>
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

      {showIngredientImport && currentRecipe && (
        <BulkIngredientImport 
          onImport={handleAddIngredients}
          onClose={() => {
            setShowIngredientImport(false);
            setCurrentRecipe(null);
          }}
          existingIngredientIds={new Set(currentRecipe.ingredients.map(i => i.ingredientId))}
        />
      )}
      
      {showProductImport && currentRecipe && (
        <ProductImport
          onImport={handleAddIngredients}
          onClose={() => {
            setShowProductImport(false);
            setCurrentRecipe(null);
          }}
          existingIngredientIds={new Set(currentRecipe.ingredients.map(i => i.ingredientId))}
        />
      )}

      {showProductToRecipeImport && (
        <ProductToRecipeImport
          onImport={handleProductToRecipeImport}
          onClose={() => setShowProductToRecipeImport(false)}
        />
      )}

      <div className="space-y-2">
        {Object.entries(recipesByCategory).map(([categoryId, { name, recipes }]) => {
          const isExpanded = expandedCategory === categoryId;
          const categoryKey = `category-${categoryId}`;
          const categoryRecipes = recipes || [];
          const allCategoryRecipesSelected = categoryRecipes.length > 0 && 
            categoryRecipes.every(recipe => selectedRecipes.has(recipe.id));
          const someCategoryRecipesSelected = categoryRecipes.some(recipe => 
            selectedRecipes.has(recipe.id)
          ) && !allCategoryRecipesSelected;
          
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
                    <div className="flex items-center gap-2">
                      {selectMode && (
                        <input
                          type="checkbox" 
                          checked={allCategoryRecipesSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAllInCategory(categoryId, !allCategoryRecipesSelected);
                          }}
                          className={`
                            h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500
                            ${someCategoryRecipesSelected ? 'indeterminate' : ''}
                          `}
                          title="Select all recipes in this category"
                        />
                      )}
                      <h3 className="font-medium text-gray-900">{name}</h3>
                    </div>
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
                          <div className="flex justify-between items-start">
                            <div className="cursor-pointer flex-grow" onClick={() => selectMode ? toggleSelectRecipe(recipe.id) : handleToggleRecipe(recipe.id)}>
                              <div className="flex items-center gap-2">
                                {selectMode && (
                                  <input
                                    type="checkbox"
                                    checked={selectedRecipes.has(recipe.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleSelectRecipe(recipe.id);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                  />
                                )}
                                <h4 className="font-medium">{recipe.name}</h4>
                                {recipe.ingredients.length > 0 && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleRecipe(recipe.id);
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                  >
                                    {expandedRecipes.has(recipe.id) ? (
                                      <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                                    ) : (
                                      <><Eye className="w-3.5 h-3.5" /> Show</>
                                    )}
                                  </button>
                                )}
                              </div>
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
                            {!selectMode && (
                              <div className="flex flex-wrap gap-2">
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
                                  onClick={() => handlePasteIngredients(recipe)}
                                  className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                                >
                                  <Clipboard className="w-4 h-4" />
                                  {justPastedIngredients === recipe.id ? 'Ingredients Pasted!' : 'Paste Ingredients'}
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
                                  onClick={() => setRecipeToDelete(recipe)}
                                  className="flex items-center gap-2 px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Display ingredients only when expanded */}
                          {recipe.ingredients.length > 0 && expandedRecipes.has(recipe.id) && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-md">
                              <h5 className="font-medium mb-2 text-sm">Ingredients:</h5>
                              <div className="space-y-1">
                                {recipe.ingredients.map((item, idx) => {
                                  const ingredient = ingredients.find(i => i.id === item.ingredientId);
                                  return (
                                    <div key={`${recipe.id}-ing-${idx}`} className="text-sm flex justify-between">
                                      <span>{ingredient?.name || 'Unknown ingredient'}</span>
                                      <span>{item.amount} {ingredient?.unit}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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

      {/* Confirmation Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!recipeToDelete}
        title="Delete Recipe"
        message={`Are you sure you want to delete the recipe "${recipeToDelete?.name}"? This action cannot be undone.`}
        onConfirm={() => recipeToDelete && handleDeleteRecipe(recipeToDelete)}
        onCancel={() => setRecipeToDelete(null)}
      />

      {/* Confirmation Dialog for Paste Ingredients */}
      <ConfirmDialog
        isOpen={showPasteConfirmation}
        title="Paste Ingredients"
        message={`Are you sure you want to add the copied ingredients to "${targetRecipeForPaste?.name}"? This will add them to any existing ingredients.`}
        onConfirm={confirmPasteIngredients}
        onCancel={() => {
          setShowPasteConfirmation(false);
          setTargetRecipeForPaste(null);
        }}
      />
    </div>
  );
}