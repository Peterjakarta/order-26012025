import React, { useState, useEffect } from 'react';
import { X, CheckSquare, FileCode, ArrowUpRight, AlertCircle, Beaker, Edit2 } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDProduct } from '../../types/rd-types';
import type { Product, Recipe } from '../../types/types';

interface MoveToProductionDialogProps {
  product: RDProduct;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MoveToProductionDialog({ 
  product, 
  onClose,
  onSuccess
}: MoveToProductionDialogProps) {
  const { 
    categories, 
    products,
    addProduct, 
    addRecipe,
    recipes
  } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>(product.category);
  const [productName, setProductName] = useState<string>(product.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAlreadyMigrated, setIsAlreadyMigrated] = useState(false);

  // Check if product has already been migrated to production
  useEffect(() => {
    // Check if there's already a product with a similar name in production
    const similarProduct = products.find(p => 
      p.name.toLowerCase() === product.name.toLowerCase() ||
      p.name.toLowerCase().includes(`${product.name.toLowerCase()} (from r&d)`)
    );
    
    // Or check for recipe created for this product
    const relatedRecipe = recipes.some(r => r.notes?.includes(`Development ID: ${product.id}`));
    
    setIsAlreadyMigrated(!!similarProduct || relatedRecipe);
  }, [product, products, recipes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedCategory) {
        throw new Error('Please select a category');
      }

      if (!productName.trim()) {
        throw new Error('Product name cannot be empty');
      }

      // Check if a product with this name already exists
      const nameExists = products.some(p => p.name.toLowerCase() === productName.toLowerCase());
      if (nameExists) {
        throw new Error('A product with this name already exists. Please choose a different name.');
      }
      
      // Generate a unique product ID
      const existingProductId = `rd-to-prod-${product.id}`;
      
      // Add recipe note to mention that this was migrated from R&D
      const recipeNotes = [
        product.notes || '',
        '',
        '--- Migrated from R&D ---',
        `Originally developed on: ${new Date(product.developmentDate).toLocaleDateString()}`,
        `Development ID: ${product.id}`
      ].join('\n');
      
      // 1. Create a new product in the production system
      const productData: Omit<Product, 'id'> = {
        name: productName.trim(),
        category: selectedCategory,
        description: product.description,
        unit: product.unit,
        price: product.price,
        minOrder: product.minOrder,
        quantityStep: product.quantityStep,
        showPrice: product.showPrice || false,
        showDescription: product.showDescription || false,
        showMinOrder: product.showMinOrder || false,
        showUnit: product.showUnit || false
      };
      
      await addProduct(productData);
      
      // 2. Create a recipe based on the R&D product's recipe information
      if (product.recipeIngredients && product.recipeIngredients.length > 0) {
        const recipeData: Omit<Recipe, 'id'> = {
          name: productName.trim(),
          description: product.description,
          category: selectedCategory,
          productId: existingProductId,
          yield: product.minOrder || 1,
          yieldUnit: product.unit || 'pcs',
          ingredients: product.recipeIngredients.map(item => ({
            ingredientId: item.ingredientId,
            amount: item.amount
          })),
          laborCost: product.costEstimate ? product.costEstimate * 0.2 : undefined, // Estimate labor as 20% of cost
          packagingCost: product.costEstimate ? product.costEstimate * 0.1 : undefined, // Estimate packaging as 10% of cost
          notes: recipeNotes
        };
        
        await addRecipe(recipeData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error migrating product:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while migrating the product');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-semibold">Move to Production</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isAlreadyMigrated ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Beaker className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-blue-800 mb-2">Already Migrated</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                This product has already been migrated to the production system. You can find it in the Products section of the Management page.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          ) : success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-2">Successfully Migrated!</h3>
              <p className="text-gray-600">
                {productName} has been successfully moved to the production system.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <FileCode className="w-5 h-5 text-cyan-700" />
                  <h3 className="font-medium text-cyan-800">Product Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                      Product Name
                    </label>
                    <input
                      id="productName"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      You can modify the product name before migrating to production
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Current Category</p>
                      <p className="font-medium">{product.category}</p>
                    </div>
                    
                    {product.price !== undefined && (
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="font-medium">${product.price.toFixed(2)}</p>
                      </div>
                    )}
                    
                    {product.unit && (
                      <div>
                        <p className="text-sm text-gray-500">Unit</p>
                        <p className="font-medium">{product.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label htmlFor="category" className="block text-base font-medium text-gray-700">
                    Select Production Category
                  </label>
                  <p className="text-sm text-gray-500">
                    Choose the category for the production version
                  </p>
                </div>
                
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 text-base"
                  required
                >
                  <option value="">-- Select Category --</option>
                  {Object.entries(categories).map(([key, { name }]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">This action will:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li>Create a new product in the production system</li>
                      <li>Copy all product details (price, description, etc.)</li>
                      {product.recipeIngredients && product.recipeIngredients.length > 0 && (
                        <li>Create a recipe with {product.recipeIngredients.length} ingredients</li>
                      )}
                      <li>Mark this R&D product as "Approved" and finalize its development</li>
                    </ul>
                  </div>
                </div>
              </div>
            
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedCategory || !productName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-md hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      Move to Production
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}