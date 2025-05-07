import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import type { Recipe, RecipeIngredient } from '../../../types/types';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';

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
  const [pastedIngredients, setPastedIngredients] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(recipe?.category || '');
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);

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

  const handlePasteIngredients = () => {
    try {
      // Parse pasted ingredients
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

      // Update ingredients
      setRecipeIngredients(prev => [...prev, ...newIngredients]);
      setPastedIngredients('');
      setShowPasteModal(false);
    } catch (err) {
      console.error('Error parsing ingredients:', err);
      alert('Invalid ingredient format. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get the selected product ID
    const productId = formData.get('productId') as string;
    if (!productId) {
      alert('Please select a product for this recipe');
      return;
    }

    // Validate and clean up the data
    const category = (formData.get('category') as string).trim();
    const yieldAmount = Math.max(1, parseInt(formData.get('yield') as string) || 0);
    const yieldUnit = (formData.get('yieldUnit') as string).trim();
    const description = (formData.get('description') as string)?.trim() || '';
    const notes = (formData.get('notes') as string)?.trim() || '';
    
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

    // Validate required fields
    if (!category || !yieldUnit || !selectedProduct) {
      alert('Please fill in all required fields');
      return;
    }

    // Clean up ingredients - remove any with empty IDs or 0 amounts
    const validIngredients = recipeIngredients.filter(
      item => item.ingredientId && item.amount > 0
    );

    if (validIngredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    // Create the recipe data object using the product name
    const recipeData: Omit<Recipe, 'id'> = {
      name: selectedProduct.name,
      description,
      category,
      ingredients: validIngredients,
      yield: yieldAmount,
      yieldUnit,
      notes,
      productId
    };

    // Only include optional costs if they are valid numbers
    if (!isNaN(laborCost!) && laborCost! > 0) {
      recipeData.laborCost = laborCost;
    }
    if (!isNaN(packagingCost!) && packagingCost! > 0) {
      recipeData.packagingCost = packagingCost;
    }
    if (!isNaN(equipmentCost!) && equipmentCost! > 0) {
      recipeData.equipmentCost = equipmentCost;
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

    onSubmit(recipeData);
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
                  onClick={() => removeIngredient(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
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
            Packaging Cost (IDR)
          </label>
          <input
            type="number"
            id="packagingCost"
            name="packagingCost"
            defaultValue={recipe?.packagingCost || ''}
            min="0"
            step="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
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
    </form>
  );
}