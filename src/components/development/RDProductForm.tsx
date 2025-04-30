import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Upload, Star, Trash2, Plus, X, Check, AlertCircle, FileText, ClipboardList, PlusCircle } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { RDProduct } from '../../types/rd-types';
import QuantitySelector from '../product/QuantitySelector';
import { ProductCategory } from '../../types/types';
import Beaker from '../common/BeakerIcon';

interface RecipeIngredient {
  ingredientId: string;
  amount: number;
}

interface RDProductFormProps {
  product?: RDProduct | null;
  onSubmit: (data: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
  initialCategory?: string;
}

export default function RDProductForm({ product, onSubmit, onCancel, initialCategory }: RDProductFormProps) {
  const { categories, ingredients } = useStore();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | ''>(product?.category || initialCategory || '');
  const [images, setImages] = useState<string[]>(product?.imageUrls || []);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<RDProduct['status']>(product?.status || 'planning');
  const [notes, setNotes] = useState(product?.notes || '');
  const [developmentDate, setDevelopmentDate] = useState(
    product?.developmentDate || new Date().toISOString().split('T')[0]
  );
  const [targetDate, setTargetDate] = useState(product?.targetProductionDate || '');
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Recipe ingredients state
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    product?.recipeIngredients || []
  );
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientAmount, setIngredientAmount] = useState('');

  // Autofocus the first input field when the form appears
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formRef.current) {
        const firstInput = formRef.current.querySelector('input, textarea, select') as HTMLElement;
        if (firstInput) firstInput.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const addImage = () => {
    if (!imageUrl.trim()) return;
    
    // Validate URL
    try {
      new URL(imageUrl);
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    } catch (e) {
      setError('Please enter a valid URL');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Add recipe ingredient
  const addRecipeIngredient = () => {
    if (!selectedIngredient) {
      setError('Please select an ingredient');
      return;
    }

    const amount = parseFloat(ingredientAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const existingIndex = recipeIngredients.findIndex(
      item => item.ingredientId === selectedIngredient
    );

    if (existingIndex >= 0) {
      // Update existing ingredient
      setRecipeIngredients(prev => prev.map((item, i) => 
        i === existingIndex ? { ...item, amount } : item
      ));
    } else {
      // Add new ingredient
      setRecipeIngredients(prev => [
        ...prev, 
        { ingredientId: selectedIngredient, amount }
      ]);
    }

    // Reset fields
    setSelectedIngredient('');
    setIngredientAmount('');
    setError(null);
  };

  // Remove recipe ingredient
  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Get and validate required fields
      const name = formData.get('name') as string;
      if (!name.trim()) {
        setError('Product name is required');
        return;
      }

      const category = formData.get('category') as ProductCategory;
      if (!category) {
        setError('Category is required');
        return;
      }

      // Get and parse numeric values
      const price = formData.get('price') ? parseFloat(formData.get('price') as string) : undefined;
      const minOrder = formData.get('minOrder') ? parseInt(formData.get('minOrder') as string, 10) : undefined;
      const quantityStep = formData.get('quantityStep') ? parseInt(formData.get('quantityStep') as string, 10) : undefined;
      const costEstimate = formData.get('costEstimate') ? parseFloat(formData.get('costEstimate') as string) : undefined;

      // Get checkbox values
      const showPrice = formData.get('showPrice') === 'on';
      const showDescription = formData.get('showDescription') === 'on';
      const showMinOrder = formData.get('showMinOrder') === 'on';
      const showUnit = formData.get('showUnit') === 'on';

      const description = formData.get('description') as string || undefined;
      const unit = formData.get('unit') as string || undefined;

      const productData: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
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
        showUnit,
        developmentDate,
        targetProductionDate: targetDate || undefined,
        status,
        notes: notes || undefined,
        imageUrls: images,
        costEstimate,
        recipeIngredients: recipeIngredients
      };

      await onSubmit(productData);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the product');
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-sm">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-cyan-600" />
          Basic Information
        </h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={product?.name || ''}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="e.g. Single Origin Dark Chocolate Truffles"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="showDescription"
                  defaultChecked={product?.showDescription}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Show description
              </label>
            </div>
            <textarea
              id="description"
              name="description"
              defaultValue={product?.description || ''}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              placeholder="Detailed product description..."
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="">Select Category</option>
              {Object.entries(categories).map(([key, { name }]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                Unit
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="showUnit"
                  defaultChecked={product?.showUnit}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Show unit
              </label>
            </div>
            <input
              type="text"
              id="unit"
              name="unit"
              defaultValue={product?.unit || ''}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="e.g. boxes, pieces, etc."
            />
          </div>
        </div>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-cyan-600" />
          Product Details
        </h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="showPrice"
                  defaultChecked={product?.showPrice}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Show price
              </label>
            </div>
            <input
              type="number"
              id="price"
              name="price"
              defaultValue={product?.price}
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              placeholder="Enter price"
            />
          </div>

          <div>
            <label htmlFor="costEstimate" className="block text-sm font-medium text-gray-700 mb-1">
              Cost Estimate
            </label>
            <input
              type="number"
              id="costEstimate"
              name="costEstimate"
              defaultValue={product?.costEstimate}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Estimated production cost"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="minOrder" className="block text-sm font-medium text-gray-700">
                Minimum Order
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  name="showMinOrder"
                  defaultChecked={product?.showMinOrder}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                Show minimum order
              </label>
            </div>
            <input
              type="number"
              id="minOrder"
              name="minOrder"
              defaultValue={product?.minOrder}
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              placeholder="Minimum order quantity"
            />
          </div>

          <div>
            <label htmlFor="quantityStep" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Step
            </label>
            <input
              type="number"
              id="quantityStep"
              name="quantityStep"
              defaultValue={product?.quantityStep}
              min="1"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="e.g. 5 (order by multiples of)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to use category default
            </p>
          </div>
        </div>
      </div>

      {/* Recipe Ingredients Section */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-600" />
          Recipe Ingredients
        </h3>
        
        <div className="space-y-4">
          {/* Add Ingredient Form */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="ingredient" className="block text-sm font-medium text-gray-700 mb-1">
                Ingredient
              </label>
              <select
                id="ingredient"
                value={selectedIngredient}
                onChange={(e) => setSelectedIngredient(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">Select an ingredient</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-32">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                value={ingredientAmount}
                onChange={(e) => setIngredientAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="e.g. 100"
              />
            </div>
            
            <button
              type="button"
              onClick={addRecipeIngredient}
              className="mb-0.5 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add
            </button>
          </div>
          
          {/* Ingredients List */}
          {recipeIngredients.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingredient
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recipeIngredients.map((item, index) => {
                    const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {ingredient?.name || 'Unknown ingredient'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-900">{item.amount}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{ingredient?.unit || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            type="button" 
                            onClick={() => removeRecipeIngredient(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">No ingredients added yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600" />
          Development Schedule
        </h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="developmentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Development Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="developmentDate"
              value={developmentDate}
              onChange={(e) => setDevelopmentDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
              Target Production Date
            </label>
            <input
              type="date"
              id="targetDate"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={developmentDate}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Development Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as RDProduct['status'])}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="planning">Planning</option>
              <option value="development">In Development</option>
              <option value="testing">Testing</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-600" />
          Notes and Documentation
        </h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Development Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="Enter development notes, recipe ideas, test results, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Images
            </label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative group rounded-lg overflow-hidden border">
                      <img 
                        src={url} 
                        alt={`Product image ${index + 1}`} 
                        className="w-full h-32 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {product ? 'Update' : 'Create'} R&D Product
        </button>
      </div>
    </form>
  );
}