import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Copy, Beaker, Info, ArrowDown } from 'lucide-react';
import type { Recipe, RecipeIngredient, Product } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';
import { calculateRecipeWeight, applyWeightBasedCosts, loadGlobalCostRates } from '../../../utils/recipeWeightCalculations';

interface RecipeFormProps {
  recipe?: Recipe | null;
  onSubmit: (data: Omit<Recipe, 'id'>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function RecipeForm({ recipe, onSubmit, onCancel, isEditing }: RecipeFormProps) {
  const { ingredients, categories, getProductsByCategory } = useStore();
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  );
  const [shellIngredients, setShellIngredients] = useState<RecipeIngredient[]>(
    recipe?.shellIngredients || []
  );
  const [pastedIngredients, setPastedIngredients] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(recipe?.category || '');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showShellPasteModal, setShowShellPasteModal] = useState(false);
  const [useWeightBasedCalculation, setUseWeightBasedCalculation] = useState(true);
  const [recipeWeight, setRecipeWeight] = useState(0);
  
  // Update weight whenever ingredients change
  useEffect(() => {
    // Check if there's a recipe and it has a yield value
    if (recipe?.yield) {
      const weight = calculateRecipeWeight({...recipe, ingredients: recipeIngredients}, ingredients);
      setRecipeWeight(weight);
    }
  }, [recipeIngredients, ingredients, recipe]);

  // Update products when category changes
  useEffect(() => {
    if (selectedCategory) {
      const products = getProductsByCategory(selectedCategory);
      setCategoryProducts(products);
      
      // If editing or copying, try to find the existing product
      if (recipe?.productId) {
        const product = products.find(p => p.id === recipe.productId);
        setSelectedProduct(product || null);
      } else {
        setSelectedProduct(null);
      }
    } else {
      setCategoryProducts([]);
      setSelectedProduct(null);
    }
  }, [selectedCategory, getProductsByCategory, recipe]);

  // Apply weight-based cost rates when enabled
  useEffect(() => {
    if (recipe && useWeightBasedCalculation && recipeWeight > 0) {
      const weightBasedCosts = applyWeightBasedCosts(
        { ...recipe, ingredients: recipeIngredients },
        ingredients,
        loadGlobalCostRates()
      );
    }
  }, [useWeightBasedCalculation, recipeWeight, recipe, recipeIngredients, ingredients]);

  const handlePasteIngredients = () => {
    try {
      const lines = pastedIngredients.trim().split('\n');
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

      setRecipeIngredients(prev => [...prev, ...newIngredients]);
      setPastedIngredients('');
      setShowPasteModal(false);
    } catch (err) {
      console.error('Error parsing ingredients:', err);
      alert('Invalid ingredient format. Please try again.');
    }
  };

  const handlePasteShellIngredients = () => {
    try {
      const lines = pastedIngredients.trim().split('\n');
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

      setShellIngredients(prev => [...prev, ...newIngredients]);
      setPastedIngredients('');
      setShowShellPasteModal(false);
    } catch (err) {
      console.error('Error parsing shell ingredients:', err);
      alert('Invalid ingredient format. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submission started');

    try {
      const formData = new FormData(e.currentTarget);

      // Validate and clean up the data
      const category = (formData.get('category') as string)?.trim();
      const productId = formData.get('productId') as string;
      const yieldAmount = Math.max(1, parseInt(formData.get('yield') as string) || 0);
      const yieldUnit = (formData.get('yieldUnit') as string)?.trim();
      const description = (formData.get('description') as string)?.trim() || '';
      const notes = (formData.get('notes') as string)?.trim() || '';

      // Debug logging
      console.log('Form validation:', {
        category,
        productId,
        selectedProduct,
        categoryProducts,
        yieldUnit,
        yieldAmount
      });

      // Validate required fields first
      if (!category) {
        alert('Please select a category');
        return;
      }

      if (!productId || !selectedProduct) {
        alert(`Please select a product for this recipe.\n\nDebug info:\nCategory: ${category}\nProduct ID: ${productId}\nSelected Product: ${selectedProduct?.name || 'None'}\nAvailable Products: ${categoryProducts.length}`);
        return;
      }

      if (!yieldUnit) {
        alert('Please enter a yield unit (e.g., pcs, kg)');
        return;
      }

    // Parse optional numeric fields
    const laborCost = formData.get('laborCost') ?
      parseFloat(formData.get('laborCost') as string) : undefined;
    const packagingCost = formData.get('packagingCost') ?
      parseFloat(formData.get('packagingCost') as string) : undefined;
    const equipmentCost = formData.get('equipmentCost') ?
      parseFloat(formData.get('equipmentCost') as string) : undefined;
    const rejectPercentage = formData.get('rejectPercentage') ?
      parseFloat(formData.get('rejectPercentage') as string) : undefined;
    const taxPercentage = formData.get('taxPercentage') ?
      parseFloat(formData.get('taxPercentage') as string) : undefined;
    const marginPercentage = formData.get('marginPercentage') ?
      parseFloat(formData.get('marginPercentage') as string) : undefined;

    // Clean up ingredients - remove any with empty IDs or 0 amounts
    const validIngredients = recipeIngredients.filter(
      item => item.ingredientId && item.amount > 0
    );

    const validShellIngredients = shellIngredients.filter(
      item => item.ingredientId && item.amount > 0
    );

    if (validIngredients.length === 0 && validShellIngredients.length === 0) {
      alert('Please add at least one ingredient (recipe or shell)');
      return;
    }

    // If weight-based calculation is enabled and we have a recipe weight,
    // calculate costs based on weight
    let finalLaborCost = laborCost;
    let finalPackagingCost = packagingCost;
    let finalEquipmentCost = equipmentCost;
    
    if (useWeightBasedCalculation && recipeWeight > 0) {
      const weightBasedCosts = applyWeightBasedCosts(
        { 
          ...recipe, 
          yield: yieldAmount, 
          ingredients: validIngredients 
        }, 
        ingredients,
        loadGlobalCostRates()
      );
      
      finalLaborCost = weightBasedCosts.laborCost;
      finalPackagingCost = weightBasedCosts.packagingCost;
      finalEquipmentCost = weightBasedCosts.equipmentCost;
    }

    // Create the recipe data object using the product name
    const recipeData: Omit<Recipe, 'id'> = {
      name: selectedProduct.name,
      description,
      category,
      ingredients: validIngredients,
      shellIngredients: validShellIngredients,
      yield: yieldAmount,
      yieldUnit,
      notes,
      productId
    };

    // Only include optional costs if they are valid numbers
    if (finalLaborCost !== undefined && !isNaN(finalLaborCost) && finalLaborCost > 0) {
      recipeData.laborCost = finalLaborCost;
    }
    if (finalPackagingCost !== undefined && !isNaN(finalPackagingCost) && finalPackagingCost > 0) {
      recipeData.packagingCost = finalPackagingCost;
    }
    if (finalEquipmentCost !== undefined && !isNaN(finalEquipmentCost) && finalEquipmentCost > 0) {
      recipeData.equipmentCost = finalEquipmentCost;
    }
    if (!isNaN(rejectPercentage!) && rejectPercentage! >= 0) {
      recipeData.rejectPercentage = rejectPercentage;
    }
    if (!isNaN(taxPercentage!) && taxPercentage! >= 0) {
      recipeData.taxPercentage = taxPercentage;
    }
    if (!isNaN(marginPercentage!) && marginPercentage! >= 0) {
      recipeData.marginPercentage = marginPercentage;
    }

      console.log('Calling onSubmit with recipeData:', recipeData);
      await onSubmit(recipeData);
      console.log('onSubmit completed successfully');
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to submit recipe: ${error?.message || 'Unknown error'}\n\nCheck browser console for details.`);
    }
  };

  const addIngredient = () => {
    setRecipeIngredients(prev => [
      ...prev,
      { ingredientId: '', amount: 0 }
    ]);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setRecipeIngredients(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'amount') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return { ...item, amount: isNaN(numValue) ? 0 : Math.max(0, numValue) };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addShellIngredient = () => {
    setShellIngredients(prev => [
      ...prev,
      { ingredientId: '', amount: 0 }
    ]);
  };

  const removeShellIngredient = (index: number) => {
    setShellIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateShellIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setShellIngredients(prev => prev.map((item, i) => {
      if (i === index) {
        if (field === 'amount') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          return { ...item, amount: isNaN(numValue) ? 0 : Math.max(0, numValue) };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const moveToShell = (index: number) => {
    const ingredient = recipeIngredients[index];
    if (!ingredient || !ingredient.ingredientId) return;

    setShellIngredients(prev => [...prev, ingredient]);
    removeIngredient(index);
  };

  const moveToRecipe = (index: number) => {
    const ingredient = shellIngredients[index];
    if (!ingredient || !ingredient.ingredientId) return;

    setRecipeIngredients(prev => [...prev, ingredient]);
    removeShellIngredient(index);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
          >
            <option value="">Select Category</option>
            {Object.entries(categories).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <div>
            <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              id="productId"
              name="productId"
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const product = categoryProducts.find(p => p.id === e.target.value);
                setSelectedProduct(product || null);
              }}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Select Product</option>
              {categoryProducts.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={recipe?.description}
            rows={2}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            placeholder="Brief description of the recipe"
          />
        </div>

        <div>
          <label htmlFor="yield" className="block text-sm font-medium text-gray-700">
            Yield <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              id="yield"
              name="yield"
              defaultValue={recipe?.yield || 1}
              required
              min="1"
              step="1"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
            <input
              type="text"
              id="yieldUnit"
              name="yieldUnit"
              defaultValue={recipe?.yieldUnit}
              required
              placeholder="Unit"
              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Ingredients <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" />
              Paste Ingredients
            </button>
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              <Plus className="w-4 h-4" />
              Add Ingredient
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {recipeIngredients.map((item, index) => {
            const selectedIngredient = ingredients.find(i => i.id === item.ingredientId);
            
            return (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-grow">
                  <select
                    value={item.ingredientId}
                    onChange={(e) => updateIngredient(index, 'ingredientId', e.target.value)}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  >
                    <option value="">Select Ingredient</option>
                    {ingredients.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-48 flex items-center gap-2">
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                    placeholder="Amount"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {selectedIngredient?.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => moveToShell(index)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                  title="Move to Shell Ingredients"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        
        {recipeWeight > 0 && (
          <div className="mt-4 bg-purple-50 p-3 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">Recipe Weight: {recipeWeight.toFixed(0)} grams</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Shell Ingredients
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowShellPasteModal(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" />
              Paste Shell Ingredients
            </button>
            <button
              type="button"
              onClick={addShellIngredient}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              <Plus className="w-4 h-4" />
              Add Shell Ingredient
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {shellIngredients.map((item, index) => {
            const selectedIngredient = ingredients.find(i => i.id === item.ingredientId);

            return (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-grow">
                  <select
                    value={item.ingredientId}
                    onChange={(e) => updateShellIngredient(index, 'ingredientId', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  >
                    <option value="">Select Shell Ingredient</option>
                    {ingredients.map(ingredient => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({formatIDR(ingredient.price)} per {ingredient.packageSize} {ingredient.packageUnit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-48 flex items-center gap-2">
                  <input
                    type="number"
                    value={item.amount || ''}
                    onChange={(e) => updateShellIngredient(index, 'amount', e.target.value)}
                    min="0"
                    step="0.01"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                    placeholder="Amount"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {selectedIngredient?.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => moveToRecipe(index)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-md rotate-180"
                  title="Move to Recipe Ingredients"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeShellIngredient(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Overhead Costs</h3>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useWeightBasedCost"
              checked={useWeightBasedCalculation}
              onChange={(e) => setUseWeightBasedCalculation(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
            />
            <label htmlFor="useWeightBasedCost" className="text-sm font-medium">
              Use weight-based calculation
            </label>
          </div>
        </div>
        
        {useWeightBasedCalculation && (
          <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">Weight-Based Cost Calculation</p>
                <p>Costs will be calculated automatically based on recipe weight (grams) and global cost rates.</p>
                <p className="mt-1">These fields will be auto-filled when you save the recipe.</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="laborCost" className="block text-sm font-medium text-gray-700">
              Labor Cost (IDR)
            </label>
            <input
              type="number"
              id="laborCost"
              name="laborCost"
              defaultValue={recipe?.laborCost || ''}
              min="0"
              step="1"
              disabled={useWeightBasedCalculation}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Optional"
            />
            {recipe?.laborCost && (
              <p className="mt-1 text-sm text-gray-500">
                Current cost: {formatIDR(recipe.laborCost)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="packagingCost" className="block text-sm font-medium text-gray-700">
              Electricity Cost (IDR)
            </label>
            <input
              type="number"
              id="packagingCost"
              name="packagingCost"
              defaultValue={recipe?.packagingCost || ''}
              min="0"
              step="1"
              disabled={useWeightBasedCalculation}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Optional"
            />
            {recipe?.packagingCost && (
              <p className="mt-1 text-sm text-gray-500">
                Current cost: {formatIDR(recipe.packagingCost)}
              </p>
            )}
          </div>

          {/* New fields for additional costs and calculations */}
          <div>
            <label htmlFor="equipmentCost" className="block text-sm font-medium text-gray-700">
              Equipment Cost (IDR)
            </label>
            <input
              type="number"
              id="equipmentCost"
              name="equipmentCost"
              defaultValue={recipe?.equipmentCost || ''}
              min="0"
              step="1"
              disabled={useWeightBasedCalculation}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Optional"
            />
            {recipe?.equipmentCost && (
              <p className="mt-1 text-sm text-gray-500">
                Current cost: {formatIDR(recipe.equipmentCost)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="rejectPercentage" className="block text-sm font-medium text-gray-700">
              Reject Percentage (%)
            </label>
            <input
              type="number"
              id="rejectPercentage"
              name="rejectPercentage"
              defaultValue={recipe?.rejectPercentage || ''}
              min="0"
              max="100"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g. 5%"
            />
          </div>

          <div>
            <label htmlFor="taxPercentage" className="block text-sm font-medium text-gray-700">
              Tax Percentage (%)
            </label>
            <input
              type="number"
              id="taxPercentage"
              name="taxPercentage"
              defaultValue={recipe?.taxPercentage || ''}
              min="0"
              max="100"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g. 10%"
            />
          </div>

          <div>
            <label htmlFor="marginPercentage" className="block text-sm font-medium text-gray-700">
              Margin Percentage (%)
            </label>
            <input
              type="number"
              id="marginPercentage"
              name="marginPercentage"
              defaultValue={recipe?.marginPercentage || ''}
              min="0"
              max="100"
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
              placeholder="e.g. 30%"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={recipe?.notes}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
          placeholder="Additional notes or instructions"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          {isEditing ? 'Update' : 'Add'} Recipe
        </button>
      </div>

      {/* Paste Ingredients Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-medium">Paste Ingredients</h3>
            <p className="text-sm text-gray-600">
              Paste the copied ingredients here. Each line should be in the format: ingredientId|amount
            </p>
            <textarea
              value={pastedIngredients}
              onChange={(e) => setPastedIngredients(e.target.value)}
              className="w-full h-40 p-2 border rounded-md font-mono text-sm"
              placeholder="ingredientId|amount"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteIngredients}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Add Ingredients
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Shell Ingredients Modal */}
      {showShellPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-medium">Paste Shell Ingredients</h3>
            <p className="text-sm text-gray-600">
              Paste the copied shell ingredients here. Each line should be in the format: ingredientId|amount
            </p>
            <textarea
              value={pastedIngredients}
              onChange={(e) => setPastedIngredients(e.target.value)}
              className="w-full h-40 p-2 border rounded-md font-mono text-sm"
              placeholder="ingredientId|amount"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShellPasteModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteShellIngredients}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Add Shell Ingredients
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}