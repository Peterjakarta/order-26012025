import React, { useState, useEffect } from 'react';
import { X, Search, Check, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useStore } from '../../../../store/StoreContext';
import type { Product, RecipeIngredient, Ingredient } from '../../../../types/types';
import { formatIDR } from '../../../../utils/currencyFormatter';

interface ProductImportProps {
  onImport: (ingredients: RecipeIngredient[]) => void;
  onClose: () => void;
  existingIngredientIds?: Set<string>;
}

export default function ProductImport({ 
  onImport, 
  onClose,
  existingIngredientIds = new Set()
}: ProductImportProps) {
  const { products, ingredients, categories, addIngredient } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [productAmounts, setProductAmounts] = useState<Record<string, string>>({});
  
  // Track which products should create new ingredients
  const [createIngredients, setCreateIngredients] = useState<Set<string>>(new Set());
  
  // Map to store matching ingredients for each product
  const [matchingIngredients, setMatchingIngredients] = useState<Record<string, Ingredient | null>>({});

  // Filter products based on search term and category
  const filteredProducts = products
    .filter(product => {
      // Filter by search term
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by selected category
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Find matching ingredients for all products
  useEffect(() => {
    const matches: Record<string, Ingredient | null> = {};
    
    filteredProducts.forEach(product => {
      // Find an ingredient with the same name as the product
      const match = ingredients.find(
        ing => ing.name.toLowerCase() === product.name.toLowerCase()
      ) || null;
      
      matches[product.id] = match;
    });
    
    setMatchingIngredients(matches);
  }, [filteredProducts, ingredients]);

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        // Also remove from createIngredients if it exists there
        setCreateIngredients(prevCreate => {
          const nextCreate = new Set(prevCreate);
          nextCreate.delete(productId);
          return nextCreate;
        });
      } else {
        next.add(productId);
        // If no matching ingredient exists, default to creating a new one
        if (!matchingIngredients[productId]) {
          setCreateIngredients(prevCreate => {
            const nextCreate = new Set(prevCreate);
            nextCreate.add(productId);
            return nextCreate;
          });
        }
      }
      return next;
    });
    
    // Initialize the amount when selecting
    if (!productAmounts[productId]) {
      setProductAmounts(prev => ({
        ...prev,
        [productId]: '1'
      }));
    }
  };

  const handleToggleCreateIngredient = (productId: string) => {
    setCreateIngredients(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleAmountChange = (productId: string, amount: string) => {
    setProductAmounts(prev => ({
      ...prev,
      [productId]: amount
    }));
  };

  const handleImport = async () => {
    setError(null);
    
    try {
      if (selectedProducts.size === 0) {
        setError('Please select at least one product');
        return;
      }
      
      setProcessing(true);
      setLoading(true);
      
      // Create recipe ingredients array
      const recipeIngredients: RecipeIngredient[] = [];
      const productList = Array.from(selectedProducts);
      
      // Process each selected product
      for (const productId of productList) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        
        // Get amount for this product
        const amountStr = productAmounts[productId] || '1';
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
          console.warn(`Invalid amount for ${product.name}, using 1 instead`);
          continue;
        }
        
        // Check if we have a matching ingredient
        const matchingIngredient = matchingIngredients[productId];
        
        if (matchingIngredient && !existingIngredientIds.has(matchingIngredient.id)) {
          // Use existing ingredient
          recipeIngredients.push({
            ingredientId: matchingIngredient.id,
            amount
          });
        } 
        else if (createIngredients.has(productId)) {
          try {
            // Create a new ingredient based on the product
            const newIngredientData = {
              name: product.name,
              unit: product.unit || 'pcs',
              packageSize: 1,
              packageUnit: product.unit || 'pcs',
              price: product.price || 0
            };
            
            // Add new ingredient
            const newIngredientId = await addIngredient(newIngredientData);
            
            // Add to recipe ingredients
            if (newIngredientId) {
              recipeIngredients.push({
                ingredientId: newIngredientId,
                amount
              });
            }
          } catch (err) {
            console.error(`Failed to create ingredient for product ${product.name}:`, err);
            setError(`Failed to create ingredient for ${product.name}`);
          }
        }
        // If no matching ingredient and not creating a new one, skip this product
      }
      
      // Import the recipe ingredients
      onImport(recipeIngredients);
      onClose();
    } catch (err) {
      console.error('Error importing products:', err);
      setError('Failed to import products. Please try again.');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold">Import Products as Ingredients</h3>
            <p className="text-sm text-gray-600 mt-1">
              Select products to add as ingredients to your recipe
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-md">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
            <h4 className="font-medium mb-2 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              How this works:
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li><span className="text-green-600 font-medium">Green</span> products already have a matching ingredient with the same name.</li>
              <li><span className="text-amber-600 font-medium">Amber</span> products don't have a matching ingredient - check "Create new ingredient" to create one.</li>
              <li>If you don't create a new ingredient, the product won't be added to the recipe.</li>
            </ul>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search & Category Filters */}
            <div className="w-full md:w-1/2 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(categories).map(([id, { name }]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Selected Count & Action Buttons */}
            <div className="w-full md:w-1/2">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Selection Summary</h4>
                <p className="text-sm">
                  <span className="font-medium">{selectedProducts.size}</span> product{selectedProducts.size !== 1 ? 's' : ''} selected
                </p>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <p>
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    {Object.entries(matchingIngredients)
                      .filter(([id, ingredient]) => selectedProducts.has(id) && ingredient !== null)
                      .length} products have matching ingredients
                  </p>
                  <p>
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
                    {Array.from(createIngredients).filter(id => selectedProducts.has(id)).length} new ingredients will be created
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b">
              <div className="grid grid-cols-12 text-sm font-medium text-gray-500">
                <div className="col-span-1"></div>
                <div className="col-span-4">Product</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-3">Create Ingredient</div>
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No products found matching your search
                </div>
              ) : (
                filteredProducts.map(product => {
                  const isSelected = selectedProducts.has(product.id);
                  const matchingIngredient = matchingIngredients[product.id];
                  const hasMatchingIngredient = !!matchingIngredient;
                  const isExistingIngredient = hasMatchingIngredient && existingIngredientIds.has(matchingIngredient.id);
                  const willCreateIngredient = createIngredients.has(product.id);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`p-3 grid grid-cols-12 items-center hover:bg-gray-50 ${
                        isSelected ? 'bg-pink-50/50' : ''
                      } ${
                        isExistingIngredient ? 'opacity-50' : ''
                      } ${
                        hasMatchingIngredient ? 'border-l-4 border-green-500' : 
                        (willCreateIngredient ? 'border-l-4 border-amber-500' : '')
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="col-span-1">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(product.id)}
                            disabled={isExistingIngredient || processing}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                        </label>
                      </div>
                      
                      {/* Product Info */}
                      <div 
                        className="col-span-4 cursor-pointer"
                        onClick={() => !isExistingIngredient && !processing && handleToggleProduct(product.id)}
                      >
                        <div className={`font-medium ${
                          hasMatchingIngredient ? 'text-green-600' : 'text-amber-600'
                        }`}>
                          {product.name}
                        </div>
                        <div className="text-xs mt-0.5">
                          {hasMatchingIngredient ? (
                            <span className="text-green-600">
                              {isExistingIngredient ? 'Already in recipe' : 'Matching ingredient exists'}
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              No matching ingredient found
                            </span>
                          )}
                        </div>
                        {isSelected && product.unit && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Unit: {product.unit}
                          </div>
                        )}
                      </div>
                      
                      {/* Category */}
                      <div className="col-span-2 text-sm">
                        {categories[product.category]?.name || product.category}
                      </div>
                      
                      {/* Amount Input */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={productAmounts[product.id] || ''}
                          onChange={(e) => handleAmountChange(product.id, e.target.value)}
                          disabled={!isSelected || isExistingIngredient || processing}
                          min="0.01"
                          step="0.01"
                          className={`w-20 p-1 text-center border rounded ${
                            isSelected && !isExistingIngredient ? 'border-pink-300' : 'border-gray-300 bg-gray-100'
                          }`}
                          placeholder="Amount"
                        />
                      </div>
                      
                      {/* Create Ingredient Checkbox */}
                      <div className="col-span-3">
                        {!hasMatchingIngredient ? (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={willCreateIngredient}
                              onChange={() => handleToggleCreateIngredient(product.id)}
                              disabled={!isSelected || isExistingIngredient || processing}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-sm text-amber-600 font-medium">
                              Create new ingredient
                            </span>
                          </label>
                        ) : isExistingIngredient ? (
                          <span className="text-xs text-gray-500">
                            Already in recipe
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-green-600">
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Will use existing</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedProducts.size === 0 || processing}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {processing ? 'Importing...' : `Import Selected (${selectedProducts.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}