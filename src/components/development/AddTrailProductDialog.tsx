import React, { useState, useEffect } from 'react';
import { X, Star, AlertCircle, Save, Info, ClipboardList, Check } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDProduct } from '../../types/rd-types';
import type { Product, Recipe } from '../../types/types';

interface AddTrailProductDialogProps {
  product: RDProduct;
  onClose: () => void;
  onSuccess: () => void;
  isUpdate: boolean;
}

export default function AddTrailProductDialog({ 
  product, 
  onClose,
  onSuccess,
  isUpdate
}: AddTrailProductDialogProps) {
  const { 
    categories, 
    products,
    ingredients,
    recipes,
    addProduct, 
    updateProduct,
    addRecipe,
    updateRecipe
  } = useStore();
  
  const [productName, setProductName] = useState<string>(
    product.name.startsWith('TRL') ? product.name : `TRL ${product.name}`
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('trail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Find existing product if this is an update
  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [existingRecipe, setExistingRecipe] = useState<Recipe | null>(null);
  
  useEffect(() => {
    if (isUpdate) {
      // Find existing product by looking for recipe that references this R&D product
      const foundRecipe = recipes.find(r => 
        r.notes && r.notes.includes(`Development ID: ${product.id}`)
      );
      
      if (foundRecipe) {
        setExistingRecipe(foundRecipe);
        const foundProduct = products.find(p => p.id === foundRecipe.productId);
        if (foundProduct) {
          setExistingProduct(foundProduct);
          setProductName(foundProduct.name);
          setSelectedCategory(foundProduct.category);
        }
      }
    }
  }, [isUpdate, product.id, recipes, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('=== Starting Trail Product Creation (Manual Process) ===');
      console.log('Product name:', productName);
      console.log('Selected category:', selectedCategory);
      console.log('Is update:', isUpdate);
      console.log('Has recipe ingredients:', !!(product.recipeIngredients && product.recipeIngredients.length > 0));
      
      if (!selectedCategory) {
        throw new Error('Please select a category');
      }

      if (!productName.trim()) {
        throw new Error('Product name cannot be empty');
      }

      // Validate the selected category exists in our categories
      if (!categories[selectedCategory]) {
        throw new Error(`Category "${selectedCategory}" does not exist`);
      }

      // Check if a product with this name already exists (only for new products)
      if (!isUpdate) {
        const nameExists = products.some(p => 
          p.name.toLowerCase() === productName.trim().toLowerCase()
        );
        
        if (nameExists) {
          throw new Error('A product with this name already exists. Please choose a different name.');
        }
      }

      // Step 1: Create/Update Product (following exact manual process from ProductForm.tsx)
      console.log('Step 1: Creating/updating product...');
      
      const productData: Omit<Product, 'id'> = {
        name: productName.trim(),
        category: selectedCategory as any, // This creates the category relationship
        description: product.description || `Trail version of R&D product: ${product.name}`,
        unit: product.unit || 'pcs',
        price: product.price,
        minOrder: product.minOrder || 1,
        quantityStep: product.quantityStep,
        showPrice: product.showPrice !== false,
        showDescription: product.showDescription !== false,
        showMinOrder: product.showMinOrder !== false,
        showUnit: product.showUnit !== false
      };

      let createdProductId: string;

      if (isUpdate && existingProduct) {
        console.log('Updating existing product:', existingProduct.id);
        await updateProduct(existingProduct.id, productData);
        createdProductId = existingProduct.id;
        console.log('Product updated successfully');
      } else {
        console.log('Creating new product with data:', productData);
        
        // Use the exact same addProduct call as manual creation
        await addProduct(productData);
        
        // Find the newly created product by name and category
        console.log('Looking for newly created product...');
        
        // Wait a moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force a manual search for the product
        const foundProduct = products.find(p => 
          p.name === productName.trim() && p.category === selectedCategory
        );
        
        if (!foundProduct) {
          throw new Error(`Product was created but could not be found. Name: "${productName.trim()}", Category: "${selectedCategory}"`);
        }
        
        createdProductId = foundProduct.id;
        console.log('Found newly created product with ID:', createdProductId);
      }
      
      // Step 2: Create/Update Recipe if ingredients exist (following exact manual process from RecipeForm.tsx)
      if (product.recipeIngredients && product.recipeIngredients.length > 0) {
        console.log('Step 2: Creating/updating recipe...');
        console.log('Using product ID for recipe:', createdProductId);
        
        // Validate all ingredients exist
        const missingIngredients = product.recipeIngredients.filter(ri => 
          !ingredients.find(i => i.id === ri.ingredientId)
        );
        
        if (missingIngredients.length > 0) {
          console.warn('Some ingredients are missing:', missingIngredients);
          // Continue anyway - missing ingredients will be ignored
        }
        
        // Create recipe data following exact manual process
        const recipeData: Omit<Recipe, 'id'> = {
          name: productName.trim(), // Use product name as recipe name
          description: product.description || `Trail recipe for ${product.name}`,
          category: selectedCategory, // Same category as product
          productId: createdProductId, // Link to the created product
          yield: product.minOrder || 1,
          yieldUnit: product.unit || 'pcs',
          ingredients: product.recipeIngredients
            .filter(ri => ingredients.find(i => i.id === ri.ingredientId)) // Only include valid ingredients
            .map(ri => ({
              ingredientId: ri.ingredientId,
              amount: ri.amount
            })),
          notes: [
            product.notes || '',
            '',
            '--- Created from R&D Product ---',
            `Original R&D Name: ${product.name}`,
            `Development ID: ${product.id}`,
            `Created: ${new Date().toLocaleDateString()}`
          ].filter(Boolean).join('\n')
        };
        
        console.log('Recipe data to be saved:', {
          ...recipeData,
          ingredientsCount: recipeData.ingredients.length
        });
        
        if (isUpdate && existingRecipe) {
          console.log('Updating existing recipe:', existingRecipe.id);
          await updateRecipe(existingRecipe.id, recipeData);
          console.log('Recipe updated successfully');
        } else {
          console.log('Creating new recipe...');
          await addRecipe(recipeData);
          console.log('Recipe created successfully');
        }
      }
      
      setSuccess(
        isUpdate 
          ? `Trail product "${productName}" updated successfully!` 
          : `Trail product "${productName}" created successfully!`
      );
      
      console.log('=== Trail Product Creation Complete ===');
      console.log('Product should appear in:');
      console.log(`- Management → Products → ${categories[selectedCategory]?.name}`);
      console.log(`- Management → Categories → ${categories[selectedCategory]?.name}`);
      if (product.recipeIngredients && product.recipeIngredients.length > 0) {
        console.log(`- Management → Pricing → Recipes (linked to product)`);
      }
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);
      
    } catch (err) {
      console.error('Error creating trail product:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the trail product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold">
              {isUpdate ? 'Update Trail Product' : 'Add as Trail Product'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Success</p>
                <p className="text-sm">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-amber-700" />
                <h3 className="font-medium text-amber-800">Product Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    id="productName"
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
                    required
                    placeholder="Enter product name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be the name shown in Management &gt; Products
                  </p>
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Management Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
                    required
                  >
                    {Object.entries(categories).map(([key, { name }]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Product will be added to this category in Management &gt; Categories
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-200">
                  <div>
                    <p className="text-sm text-gray-500">Original R&D Name</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Development Status</p>
                    <p className="font-medium capitalize">{product.status}</p>
                  </div>
                  
                  {product.unit && (
                    <div>
                      <p className="text-sm text-gray-500">Unit</p>
                      <p className="font-medium">{product.unit}</p>
                    </div>
                  )}
                  
                  {product.minOrder && (
                    <div>
                      <p className="text-sm text-gray-500">Min Order</p>
                      <p className="font-medium">{product.minOrder}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Recipe Information Section */}
            {product.recipeIngredients && product.recipeIngredients.length > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-pink-800">
                  <ClipboardList className="w-5 h-5 text-pink-600" />
                  <h3 className="font-medium">Recipe Will Be {isUpdate ? 'Updated' : 'Created'}</h3>
                </div>
                
                <p className="text-sm text-pink-700">
                  This product has a recipe with {product.recipeIngredients.length} ingredients that will be {isUpdate ? 'updated in' : 'added to'} Management &gt; Pricing &gt; Recipes.
                </p>
                
                <div className="bg-white rounded-lg p-3 max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-pink-200">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-pink-500 uppercase">Ingredient</th>
                        <th className="text-right text-xs font-medium text-pink-500 uppercase">Amount</th>
                        <th className="text-left text-xs font-medium text-pink-500 uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pink-100">
                      {product.recipeIngredients.map((ingredient, index) => {
                        const ingredientDetails = ingredients.find(i => i.id === ingredient.ingredientId);
                        if (!ingredientDetails) return null;
                        
                        return (
                          <tr key={index} className="hover:bg-pink-50">
                            <td className="py-2 text-sm">{ingredientDetails.name}</td>
                            <td className="py-2 text-sm text-right">{ingredient.amount}</td>
                            <td className="py-2 text-sm">{ingredientDetails.unit}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">This action will:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>{isUpdate ? 'Update the existing product' : 'Create a new product'} in Management &gt; Products</li>
                    <li>Add to category: {categories[selectedCategory]?.name}</li>
                    <li>{isUpdate ? 'Update' : 'Copy'} all product details (price, description, etc.)</li>
                    {product.recipeIngredients && product.recipeIngredients.length > 0 && (
                      <li>{isUpdate ? 'Update the existing recipe' : 'Create a recipe'} in Management &gt; Pricing &gt; Recipes</li>
                    )}
                    <li>Product will automatically appear in Management &gt; Categories under {categories[selectedCategory]?.name}</li>
                  </ul>
                </div>
              </div>
            </div>
          
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedCategory || !productName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-md hover:from-amber-700 hover:to-yellow-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isUpdate ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    {isUpdate ? 'Update Trail Product' : 'Create Trail Product'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}