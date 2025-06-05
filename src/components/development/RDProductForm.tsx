import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Upload, Star, Trash2, Plus, X, Check, AlertCircle, FileText, ClipboardList, PlusCircle, Image, ArrowUpRight, Edit2 } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { RDProduct, RDCategory, TestResult } from '../../types/rd-types';
import Beaker from '../common/BeakerIcon';
import { createOrderFromRDProduct, syncRDProductWithOrder } from '../../utils/rdOrderIntegration';

interface RecipeIngredient {
  ingredientId: string;
  amount: number;
}

interface RDProductFormProps {
  product?: RDProduct | null;
  onSubmit: (data: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
  initialCategory?: string;
  rdCategories?: RDCategory[];
}

export default function RDProductForm({ 
  product, 
  onSubmit, 
  onCancel, 
  initialCategory, 
  rdCategories = []
}: RDProductFormProps) {
  const { categories, ingredients, recipes } = useStore();
  const { user } = useAuth();
  const { addOrder, updateOrder } = useOrders();
  const [selectedCategory, setSelectedCategory] = useState<string>(product?.category || initialCategory || '');
  const [images, setImages] = useState<string[]>(product?.imageUrls || []);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<RDProduct['status']>(product?.status || 'planning');
  const [notes, setNotes] = useState(product?.notes || '');
  const [developmentDate, setDevelopmentDate] = useState(
    product?.developmentDate || new Date().toISOString().split('T')[0]
  );
  const [targetDate, setTargetDate] = useState(product?.targetProductionDate || '');
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [syncingWithProduction, setSyncingWithProduction] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  
  // Recipe ingredients state
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>(
    product?.recipeIngredients || []
  );
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('upload'); // Default to upload tab
  const [recipeName, setRecipeName] = useState<string>(product?.name || '');
  const [recipeYield, setRecipeYield] = useState<number>(product?.minOrder || 1);
  const [recipeYieldUnit, setRecipeYieldUnit] = useState<string>(product?.unit || 'pcs');
  const [recipeInstructions, setRecipeInstructions] = useState<string>('');
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);

  // Check if we have an existing recipe
  useEffect(() => {
    if (product?.id) {
      const existingRecipe = recipes.find(r => r.productId === product.id);
      if (existingRecipe) {
        setRecipeName(existingRecipe.name);
        setRecipeYield(existingRecipe.yield);
        setRecipeYieldUnit(existingRecipe.yieldUnit);
        setRecipeInstructions(existingRecipe.notes || '');
        setRecipeIngredients(existingRecipe.ingredients);
      } else if (product.recipeIngredients) {
        setRecipeIngredients(product.recipeIngredients);
      }
    }
  }, [product, recipes]);

  // Test results state
  const [testResults, setTestResults] = useState<TestResult[]>(
    product?.testResults || []
  );
  const [newTestResult, setNewTestResult] = useState<{
    date: string;
    tester: string;
    result: 'pass' | 'fail' | 'pending';
    comments: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    tester: user?.email || '',
    result: 'pending',
    comments: ''
  });

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

  // Setup drag-and-drop functionality
  useEffect(() => {
    const dropzone = dropzoneRef.current;
    if (!dropzone) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('bg-cyan-50', 'border-cyan-500');
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('bg-cyan-50', 'border-cyan-500');
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('bg-cyan-50', 'border-cyan-500');
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    };
    
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    
    return () => {
      dropzone.removeEventListener('dragover', handleDragOver);
      dropzone.removeEventListener('dragleave', handleDragLeave);
      dropzone.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFiles = (files: FileList) => {
    setError(null);
    setUploadSuccess(false);
    
    const file = files[0]; // Handle only first file for now
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError(`File size should be less than 5MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
      return;
    }
    
    // Read the file as a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setImages(prevImages => [...prevImages, e.target.result]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addImage = () => {
    if (!imageUrl.trim()) return;
    setError(null);
    setUploadSuccess(false);
    
    // Validate URL
    try {
      new URL(imageUrl);
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (e) {
      setError('Please enter a valid URL');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
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

    // If we're editing an existing ingredient
    if (editingIngredientIndex !== null) {
      setRecipeIngredients(prev => prev.map((item, i) => 
        i === editingIngredientIndex ? { ingredientId: selectedIngredient, amount } : item
      ));
      setEditingIngredientIndex(null);
    } else {
      // Check if ingredient already exists
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
    }

    // Reset fields
    setSelectedIngredient('');
    setIngredientAmount('');
    setError(null);
  };

  // Edit a recipe ingredient
  const editRecipeIngredient = (index: number) => {
    const ingredient = recipeIngredients[index];
    setSelectedIngredient(ingredient.ingredientId);
    setIngredientAmount(ingredient.amount.toString());
    setEditingIngredientIndex(index);
    
    // Focus on the ingredient dropdown
    const ingredientSelect = document.getElementById('ingredient');
    if (ingredientSelect) {
      ingredientSelect.focus();
    }
  };

  // Remove recipe ingredient
  const removeRecipeIngredient = (index: number) => {
    // If we're currently editing this ingredient, cancel the edit
    if (editingIngredientIndex === index) {
      setEditingIngredientIndex(null);
      setSelectedIngredient('');
      setIngredientAmount('');
    }
    
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Add test result
  const addTestResult = () => {
    if (!newTestResult.date || !newTestResult.tester || !newTestResult.comments) {
      setError('Please fill in all test result fields');
      return;
    }

    setTestResults(prev => [
      ...prev,
      {
        id: `test-${Date.now()}`,
        date: newTestResult.date,
        tester: newTestResult.tester,
        result: newTestResult.result,
        comments: newTestResult.comments
      }
    ]);

    // Reset form
    setNewTestResult({
      date: new Date().toISOString().split('T')[0],
      tester: user?.email || '',
      result: 'pending',
      comments: ''
    });
    
    setError(null);
  };

  // Remove test result
  const removeTestResult = (index: number) => {
    setTestResults(prev => prev.filter((_, i) => i !== index));
  };

  // Function to create or update order in production system - DISABLED as per requirements
  const syncWithProductionSystem = async (productData: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, productId?: string): Promise<string | null> => {
    // This function is now disabled to prevent automatic sync
    // Will only be used when explicitly calling Move to Production
    return null;
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

      const category = formData.get('category') as string;
      if (!category) {
        setError('Category is required');
        return;
      }

      // Get and parse numeric values
      const price = formData.get('price') ? parseFloat(formData.get('price') as string) : null;
      const minOrder = formData.get('minOrder') ? parseInt(formData.get('minOrder') as string, 10) : null;
      const quantityStep = formData.get('quantityStep') ? parseInt(formData.get('quantityStep') as string, 10) : null;
      const costEstimate = formData.get('costEstimate') ? parseFloat(formData.get('costEstimate') as string) : null;

      // Get checkbox values
      const showPrice = formData.get('showPrice') === 'on';
      const showDescription = formData.get('showDescription') === 'on';
      const showMinOrder = formData.get('showMinOrder') === 'on';
      const showUnit = formData.get('showUnit') === 'on';

      // Changed these from undefined to null to fix Firestore error
      const description = formData.get('description') as string || null;
      const unit = formData.get('unit') as string || null;

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
        targetProductionDate: targetDate || null,
        status,
        notes: notes || null,
        imageUrls: images,
        costEstimate,
        recipeIngredients: recipeIngredients,
        testResults: testResults,
        orderReference: product?.orderReference
      };

      // Preserve existing order reference if available
      let orderReference = product?.orderReference;
      productData.orderReference = orderReference;

      await onSubmit(productData);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the product');
    }
  };

  // Check if product has any "Pass" test results
  const hasPassTestResults = testResults.some(test => test.result === 'pass');

  // Combine standard categories with R&D categories for the dropdown
  const allCategories = {
    ...categories,
    ...rdCategories.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: { name: cat.name }
    }), {})
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>Image added successfully!</p>
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
              onChange={(e) => setRecipeName(e.target.value)} // Update recipe name when product name changes
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
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="">Select Category</option>
              {/* Production Categories */}
              <optgroup label="Production Categories">
                {Object.entries(categories).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </optgroup>
              
              {/* Test Categories */}
              {rdCategories.length > 0 && (
                <optgroup label="Test Categories">
                  {rdCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </optgroup>
              )}
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
              onChange={(e) => setRecipeYieldUnit(e.target.value)} // Update recipe yield unit when product unit changes
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
              onChange={(e) => setRecipeYield(parseInt(e.target.value) || 1)} // Update recipe yield when min order changes
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
              Leave empty for category default
            </p>
          </div>
        </div>
      </div>

      {/* Recipe Section - Enhanced with more details */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-600" />
          Recipe Information
        </h3>
        
        <div className="space-y-4">
          {/* Recipe details */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="recipeName" className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Name
              </label>
              <input
                type="text"
                id="recipeName"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Recipe name (defaults to product name)"
              />
            </div>
            
            <div>
              <label htmlFor="recipeYield" className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Yield
              </label>
              <input
                type="number"
                id="recipeYield"
                value={recipeYield}
                onChange={(e) => setRecipeYield(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Recipe yield amount"
              />
              <p className="mt-1 text-sm text-gray-500">
                How many items this recipe produces
              </p>
            </div>
            
            <div>
              <label htmlFor="recipeYieldUnit" className="block text-sm font-medium text-gray-700 mb-1">
                Yield Unit
              </label>
              <input
                type="text"
                id="recipeYieldUnit"
                value={recipeYieldUnit}
                onChange={(e) => setRecipeYieldUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="e.g., pcs, boxes"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="recipeInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                Preparation Instructions
              </label>
              <textarea
                id="recipeInstructions"
                value={recipeInstructions}
                onChange={(e) => setRecipeInstructions(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter detailed preparation instructions and notes"
              />
            </div>
          </div>
          
          {/* Recipe Ingredients Form */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Recipe Ingredients</h4>
            
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
                {editingIngredientIndex !== null ? (
                  <>
                    <Check className="w-4 h-4" />
                    Update
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Add
                  </>
                )}
              </button>
              
              {editingIngredientIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingIngredientIndex(null);
                    setSelectedIngredient('');
                    setIngredientAmount('');
                  }}
                  className="mb-0.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
            
            {/* Ingredients List */}
            {recipeIngredients.length > 0 ? (
              <div className="border rounded-lg overflow-hidden mt-4">
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
                      const ingredient = ingredients.find(i => i.id === item.ingredientId);
                      return (
                        <tr key={index} className={`hover:bg-gray-50 ${editingIngredientIndex === index ? 'bg-cyan-50' : ''}`}>
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
                            <div className="flex justify-end gap-2">
                              <button 
                                type="button" 
                                onClick={() => editRecipeIngredient(index)}
                                className="text-cyan-600 hover:text-cyan-800 p-1 hover:bg-cyan-50 rounded-full"
                                title="Edit ingredient"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => removeRecipeIngredient(index)}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-full"
                                title="Remove ingredient"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg mt-4">
                <p className="text-sm text-gray-500">No ingredients added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Results Section */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-600" />
          Test Results
        </h3>
        
        <div className="space-y-4">
          {/* Add Test Result Form */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h4 className="font-medium">Add New Test Result</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="testDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Date
                </label>
                <input
                  type="date"
                  id="testDate"
                  value={newTestResult.date}
                  onChange={(e) => setNewTestResult({...newTestResult, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="tester" className="block text-sm font-medium text-gray-700 mb-1">
                  Tester Name
                </label>
                <input
                  type="text"
                  id="tester"
                  value={newTestResult.tester}
                  onChange={(e) => setNewTestResult({...newTestResult, tester: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Name of the tester"
                />
              </div>
              
              <div>
                <label htmlFor="testResult" className="block text-sm font-medium text-gray-700 mb-1">
                  Test Result
                </label>
                <select
                  id="testResult"
                  value={newTestResult.result}
                  onChange={(e) => setNewTestResult({...newTestResult, result: e.target.value as 'pass' | 'fail' | 'pending'})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="pending">Pending</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="testComments" className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  id="testComments"
                  value={newTestResult.comments}
                  onChange={(e) => setNewTestResult({...newTestResult, comments: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Test observations and results..."
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addTestResult}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4" />
                Add Test Result
              </button>
            </div>
          </div>
          
          {/* Test Results List */}
          {testResults.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {testResults.map((test, index) => (
                    <tr key={test.id} className={`hover:bg-gray-50 ${
                      test.result === 'pass' 
                        ? 'bg-green-50' 
                        : test.result === 'fail' 
                          ? 'bg-red-50' 
                          : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(test.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{test.tester}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          test.result === 'pass' 
                            ? 'bg-green-100 text-green-800' 
                            : test.result === 'fail' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {test.result.charAt(0).toUpperCase() + test.result.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{test.comments}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          type="button" 
                          onClick={() => removeTestResult(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">No test results added yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600" />
          Development Information
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
            <p className="mt-1 text-sm text-gray-500">
              This date will be used for development tracking
            </p>
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
            <p className="mt-1 text-sm text-gray-500">
              Optional target date for planning purposes
            </p>
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
          
          {/* Display current production status if this product is linked to an order */}
          {product?.orderReference && (
            <div className="sm:col-span-2 bg-cyan-50 p-4 rounded-lg border border-cyan-100">
              <div className="flex items-center gap-2 text-cyan-800">
                <ArrowUpRight className="w-5 h-5 text-cyan-600" />
                <p className="font-medium">
                  Linked to Production Order #{product.orderReference.slice(0, 8)}
                </p>
              </div>
              <p className="text-sm text-cyan-700 mt-1 ml-7">
                This R&D product has already been moved to production
              </p>
            </div>
          )}
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Product Images
            </label>
            
            {/* Tabs for image source */}
            <div className="flex border-b mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 ${activeTab === 'upload' ? 'text-cyan-600 border-b-2 border-cyan-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`px-4 py-2 ${activeTab === 'url' ? 'text-cyan-600 border-b-2 border-cyan-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Image URL
              </button>
            </div>
            
            <div className="space-y-4">
              {activeTab === 'url' ? (
                /* URL Input */
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
                    Add URL
                  </button>
                </div>
              ) : (
                /* File Upload Dropzone */
                <div 
                  ref={dropzoneRef}
                  className="border-2 border-dashed rounded-lg p-6 transition-colors duration-300 hover:bg-cyan-50 hover:border-cyan-500"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center text-center">
                    <Image className="w-16 h-16 mb-4 text-cyan-600" />
                    <h4 className="text-lg font-medium text-gray-700 mb-2">Click or drag image here</h4>
                    <p className="text-gray-500 text-sm mb-4 max-w-md">
                      Upload your product images directly from your computer. Supported formats: JPEG, PNG, GIF, WebP (max 5MB)
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg font-medium hover:bg-cyan-100 transition-colors"
                    >
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      aria-label="Upload image"
                    />
                  </div>
                </div>
              )}

              {/* Image Gallery */}
              {images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Images ({images.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {images.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="h-32 rounded-lg border overflow-hidden bg-gray-100">
                          <img 
                            src={url} 
                            alt={`Product image ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          aria-label="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
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
          disabled={syncingWithProduction}
        >
          {syncingWithProduction ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {product ? 'Update' : 'Create'} R&D Product
            </>
          )}
        </button>
      </div>
    </form>
  );
}