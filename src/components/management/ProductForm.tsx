import React, { useState } from 'react';
import { Plus, Trash2, ArrowDown } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useStore } from '../../store/StoreContext';
import ProductBasicInfo from './product-form/ProductBasicInfo';
import ProductPricing from './product-form/ProductPricing';
import ProductCategory from './product-form/ProductCategory';
import type { Product, RecipeIngredient } from '../../types/types';

interface ProductFormData {
  product: Omit<Product, 'id'>;
  recipe?: {
    yield: number;
    yieldUnit: string;
    ingredients: RecipeIngredient[];
    shellIngredients: RecipeIngredient[];
  };
  addAsIngredient: boolean;
  addAsProduct: boolean;
  ingredientData?: {
    usageUnit: string;
    packageSize: number;
    packageUnit: string;
    price: number;
  };
}

interface ProductFormProps {
  product?: Product | null;
  initialCategory?: string;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isCopying?: boolean;
}

export default function ProductForm({
  product,
  initialCategory,
  onSubmit,
  onCancel,
  isCopying = false
}: ProductFormProps) {
  const { categories } = useCategories();
  const { ingredients, addIngredient, addRecipe } = useStore();
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [shellIngredients, setShellIngredients] = useState<RecipeIngredient[]>([]);
  const [itemType, setItemType] = useState<'product' | 'both' | 'ingredient'>('product');
  const [recipeYield, setRecipeYield] = useState(1);
  const [recipeYieldUnit, setRecipeYieldUnit] = useState('');

  const [ingredientUsageUnit, setIngredientUsageUnit] = useState('');
  const [ingredientPackageSize, setIngredientPackageSize] = useState('');
  const [ingredientPackageUnit, setIngredientPackageUnit] = useState('');
  const [ingredientPrice, setIngredientPrice] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get checkbox values
    const showPrice = formData.get('showPrice') === 'on';
    const showDescription = formData.get('showDescription') === 'on';
    const showMinOrder = formData.get('showMinOrder') === 'on';
    const showUnit = formData.get('showUnit') === 'on';

    // Get and validate category (only required for product and both types)
    const category = formData.get('category') as string;
    if ((itemType === 'product' || itemType === 'both') && !category) {
      alert('Please select a category');
      return;
    }

    // Get and parse numeric values
    const price = formData.get('price') ? parseFloat(formData.get('price') as string) : undefined;
    const minOrder = formData.get('minOrder') ? parseInt(formData.get('minOrder') as string, 10) : undefined;
    const quantityStep = formData.get('quantityStep') ? parseInt(formData.get('quantityStep') as string, 10) : undefined;

    // Get text values
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || undefined;
    const unit = formData.get('unit') as string || undefined;

    // Validate required fields
    if (!name) {
      alert('Product name is required');
      return;
    }

    const productData: Omit<Product, 'id'> = {
      name,
      category,
      description,
      price,
      unit,
      minOrder,
      quantityStep,
      showPrice,
      showDescription,
      showMinOrder,
      showUnit
    };

    const submitData: ProductFormData = {
      product: productData,
      addAsIngredient: (itemType === 'both' || itemType === 'ingredient') && isAddingNew,
      addAsProduct: (itemType === 'product' || itemType === 'both') && isAddingNew,
    };

    // Validate ingredient fields if ingredient type is selected
    if ((itemType === 'both' || itemType === 'ingredient') && isAddingNew) {
      if (!ingredientUsageUnit.trim()) {
        alert('Usage Unit is required when adding as ingredient');
        return;
      }
      if (!ingredientPackageSize || parseFloat(ingredientPackageSize) <= 0) {
        alert('Package Size must be a positive number');
        return;
      }
      if (!ingredientPackageUnit.trim()) {
        alert('Package Unit is required when adding as ingredient');
        return;
      }
      if (!ingredientPrice || parseFloat(ingredientPrice) < 0) {
        alert('Price must be a non-negative number');
        return;
      }

      submitData.ingredientData = {
        usageUnit: ingredientUsageUnit,
        packageSize: parseFloat(ingredientPackageSize),
        packageUnit: ingredientPackageUnit,
        price: parseFloat(ingredientPrice)
      };
    }

    // Include recipe data if ingredients are provided
    if (isAddingNew && recipeIngredients.length > 0 && recipeYieldUnit) {
      submitData.recipe = {
        yield: recipeYield,
        yieldUnit: recipeYieldUnit,
        ingredients: recipeIngredients,
        shellIngredients: shellIngredients
      };
    }

    onSubmit(submitData);
  };

  const addIngredientToRecipe = () => {
    setRecipeIngredients(prev => [...prev, { ingredientId: '', amount: 0 }]);
  };

  const removeIngredientFromRecipe = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
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
    setShellIngredients(prev => [...prev, { ingredientId: '', amount: 0 }]);
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
    removeIngredientFromRecipe(index);
  };

  const moveToRecipe = (index: number) => {
    const ingredient = shellIngredients[index];
    if (!ingredient || !ingredient.ingredientId) return;

    setRecipeIngredients(prev => [...prev, ingredient]);
    removeShellIngredient(index);
  };

  const isAddingNew = !product || isCopying;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {isAddingNew && (
        <div className="pb-6 border-b">
          <h4 className="font-medium text-gray-900 mb-3">Item Type</h4>
          <p className="text-sm text-gray-600 mb-4">
            Choose how this item should be added to the system
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="itemType"
                value="product"
                checked={itemType === 'product'}
                onChange={(e) => setItemType(e.target.value as 'product' | 'both' | 'ingredient')}
                className="mt-1 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium text-gray-900">Product Only</div>
                <div className="text-sm text-gray-600">Add to Products page only (requires category)</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="itemType"
                value="both"
                checked={itemType === 'both'}
                onChange={(e) => setItemType(e.target.value as 'product' | 'both' | 'ingredient')}
                className="mt-1 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium text-gray-900">Product & Ingredient</div>
                <div className="text-sm text-gray-600">Add to both Products and Ingredients pages</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="itemType"
                value="ingredient"
                checked={itemType === 'ingredient'}
                onChange={(e) => setItemType(e.target.value as 'product' | 'both' | 'ingredient')}
                className="mt-1 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium text-gray-900">Ingredient Only</div>
                <div className="text-sm text-gray-600">Add to Ingredients page only (no category needed)</div>
              </div>
            </label>
          </div>
        </div>
      )}

      <ProductBasicInfo product={product} />
      {(itemType === 'product' || itemType === 'both' || (product && !isCopying)) && (
        <ProductCategory
          product={product}
          initialCategory={initialCategory}
          categories={categories}
        />
      )}
      {(itemType === 'product' || itemType === 'both' || (product && !isCopying)) && (
        <ProductPricing product={product} />
      )}

      {isAddingNew && (
        <>
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Recipe Information (Optional)</h3>

            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yield
                </label>
                <input
                  type="number"
                  value={recipeYield}
                  onChange={(e) => setRecipeYield(parseInt(e.target.value) || 1)}
                  min="1"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Yield Unit
                </label>
                <input
                  type="text"
                  value={recipeYieldUnit}
                  onChange={(e) => setRecipeYieldUnit(e.target.value)}
                  placeholder="e.g., pcs, kg"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Ingredients
              </label>
              <button
                type="button"
                onClick={addIngredientToRecipe}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                <Plus className="w-4 h-4" />
                Add Ingredient
              </button>
            </div>

            {recipeIngredients.length > 0 && (
              <div className="space-y-3 mb-6">
                {recipeIngredients.map((item, index) => {
                  const selectedIngredient = ingredients.find(i => i.id === item.ingredientId);
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateRecipeIngredient(index, 'ingredientId', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                        >
                          <option value="">Select ingredient...</option>
                          {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-48 flex items-center gap-2">
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => updateRecipeIngredient(index, 'amount', e.target.value)}
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
                        onClick={() => removeIngredientFromRecipe(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700 text-blue-800">
                Shell Ingredients
              </label>
              <button
                type="button"
                onClick={addShellIngredient}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Shell Ingredient
              </button>
            </div>

            {shellIngredients.length > 0 && (
              <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                {shellIngredients.map((item, index) => {
                  const selectedIngredient = ingredients.find(i => i.id === item.ingredientId);
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => updateShellIngredient(index, 'ingredientId', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select ingredient...</option>
                          {ingredients.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
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
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            )}
          </div>

          {(itemType === 'both' || itemType === 'ingredient') && (
            <div className="border-t pt-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                <h4 className="font-medium text-gray-900">Ingredient Details</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Usage Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ingredientUsageUnit}
                      onChange={(e) => setIngredientUsageUnit(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                      placeholder="e.g. grams"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Unit used in recipes
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Package Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={ingredientPackageSize}
                      onChange={(e) => setIngredientPackageSize(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                      placeholder="e.g. 1000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Size of each package purchased
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Package Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ingredientPackageUnit}
                      onChange={(e) => setIngredientPackageUnit(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                      placeholder="e.g. kg"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Unit of the package size
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (IDR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={ingredientPrice}
                      onChange={(e) => setIngredientPrice(e.target.value)}
                      min="0"
                      step="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                      placeholder="Enter price in IDR"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Price per package
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
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
          {product ? 'Update' : 'Add'} Product
        </button>
      </div>
    </form>
  );
}