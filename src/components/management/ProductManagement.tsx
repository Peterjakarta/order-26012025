import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Copy, Upload, FileSpreadsheet, Layers, FileText } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import ProductForm from './ProductForm';
import BulkProductImport from './product-form/BulkProductImport';
import BatchHACCPEdit from './product-form/BatchHACCPEdit';
import BatchInternalCodeEdit from './product-form/BatchInternalCodeEdit';
import type { Product, Recipe } from '../../types/types';
import { generateProductsExcel, saveWorkbook } from '../../utils/excelGenerator';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct, categories, addIngredient, addRecipe, ingredients, recipes, deleteIngredient, deleteRecipe } = useStore();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [copyingProduct, setCopyingProduct] = useState<Product | null>(null);
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBatchHACCP, setShowBatchHACCP] = useState(false);
  const [showBatchInternalCode, setShowBatchInternalCode] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleSubmit = async (formData: any) => {
    try {
      console.log('handleSubmit called with formData:', formData);

      if (editingProduct) {
        console.log('Updating product:', editingProduct.id, 'with data:', formData.product);
        await updateProduct(editingProduct.id, formData.product);
        setEditingProduct(null);
      } else if (copyingProduct) {
        // Handle copy with type selection
        let productId = null;

        // Add as product if requested
        if (formData.addAsProduct) {
          productId = await addProduct(formData.product);
        }

        // Add as ingredient if requested
        if (formData.addAsIngredient && formData.ingredientData) {
          const ingredientData = {
            name: formData.product.name,
            unit: formData.ingredientData.usageUnit,
            packageSize: formData.ingredientData.packageSize,
            packageUnit: formData.ingredientData.packageUnit,
            price: formData.ingredientData.price
          };
          await addIngredient(ingredientData);
        }

        // Create recipe if provided and product exists
        if (formData.recipe && productId) {
          const recipeData: Omit<Recipe, 'id'> = {
            name: formData.product.name,
            category: formData.product.category,
            productId: productId,
            yield: formData.recipe.yield,
            yieldUnit: formData.recipe.yieldUnit,
            ingredients: formData.recipe.ingredients,
            shellIngredients: formData.recipe.shellIngredients
          };
          await addRecipe(recipeData);
        }

        setCopyingProduct(null);
      } else {
        let productId = null;

        // Add as product if requested
        if (formData.addAsProduct) {
          productId = await addProduct(formData.product);
        }

        // Add as ingredient if requested
        if (formData.addAsIngredient && formData.ingredientData) {
          const ingredientData = {
            name: formData.product.name,
            unit: formData.ingredientData.usageUnit,
            packageSize: formData.ingredientData.packageSize,
            packageUnit: formData.ingredientData.packageUnit,
            price: formData.ingredientData.price
          };
          await addIngredient(ingredientData);
        }

        // Create recipe if provided and product exists
        if (formData.recipe && productId) {
          const recipeData: Omit<Recipe, 'id'> = {
            name: formData.product.name,
            category: formData.product.category,
            productId: productId,
            yield: formData.recipe.yield,
            yieldUnit: formData.recipe.yieldUnit,
            ingredients: formData.recipe.ingredients,
            shellIngredients: formData.recipe.shellIngredients
          };
          await addRecipe(recipeData);
        }

        setIsAddingProduct(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      alert(`Failed to save product. Error: ${errorMessage}`);
    }
  };

  const handleCopyProduct = (product: Product) => {
    setCopyingProduct({
      ...product,
      name: `${product.name} (Copy)`
    });
    
    // Show "Copied" indicator briefly
    setJustCopied(product.id);
    setTimeout(() => setJustCopied(null), 2000);
  };

  const handleExportToExcel = () => {
    try {
      const wb = generateProductsExcel(products, categories);
      saveWorkbook(wb, 'products-list.xlsx');
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Failed to export products. Please try again.');
    }
  };

  const handleDeleteProduct = async (product: Product, deleteEverywhere: boolean) => {
    try {
      if (deleteEverywhere) {
        // Find and delete related ingredient
        const relatedIngredient = ingredients.find(ing => ing.name === product.name);
        if (relatedIngredient) {
          await deleteIngredient(relatedIngredient.id);
        }

        // Find and delete related recipe
        const relatedRecipe = recipes.find(recipe => recipe.productId === product.id);
        if (relatedRecipe) {
          await deleteRecipe(relatedRecipe.id);
        }
      }

      // Delete the product
      await deleteProduct(product.id);
      setDeletingProduct(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-6 h-6" />
          Products
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setShowBatchInternalCode(true)}
            className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50"
          >
            <FileText className="w-4 h-4" />
            Batch Edit Codes
          </button>
          <button
            onClick={() => setShowBatchHACCP(true)}
            className="flex items-center gap-2 px-4 py-2 border border-pink-300 text-pink-600 rounded-md hover:bg-pink-50"
          >
            <Layers className="w-4 h-4" />
            Batch Edit HACCP
          </button>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {showBulkImport && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <BulkProductImport onComplete={() => setShowBulkImport(false)} />
        </div>
      )}

      {showBatchHACCP && (
        <BatchHACCPEdit onClose={() => setShowBatchHACCP(false)} />
      )}

      {showBatchInternalCode && (
        <BatchInternalCodeEdit onClose={() => setShowBatchInternalCode(false)} />
      )}

      {isAddingProduct && (
        <ProductForm
          product={null}
          onSubmit={handleSubmit}
          onCancel={() => setIsAddingProduct(false)}
        />
      )}

      {copyingProduct && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Copy Product</h3>
          <ProductForm
            product={copyingProduct}
            isCopying={true}
            onSubmit={handleSubmit}
            onCancel={() => setCopyingProduct(null)}
          />
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {products.map(product => (
          <div key={product.id}>
            {editingProduct?.id === product.id ? (
              <div className="p-4">
                <h3 className="text-lg font-medium mb-3">Edit Product</h3>
                <ProductForm
                  product={product}
                  onSubmit={handleSubmit}
                  onCancel={() => setEditingProduct(null)}
                />
              </div>
            ) : (
              <div className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  {product.showDescription && (
                    <p className="text-sm text-gray-600">{product.description}</p>
                  )}
                  {product.showPrice && (
                    <p className="text-sm">
                      ${product.price?.toFixed(2)}
                      {product.showUnit && product.unit && ` per ${product.unit}`}
                    </p>
                  )}
                  {product.showMinOrder && (
                    <p className="text-sm text-gray-500">
                      Min order: {product.minOrder}
                      {product.showUnit && product.unit && ` ${product.unit}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyProduct(product)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                    title="Copy product"
                  >
                    <Copy className="w-4 h-4" />
                    {justCopied === product.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingProduct(product)}
                    className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deletingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deletingProduct.name}"?
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Delete Options:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleDeleteProduct(deletingProduct, false)}
                  className="w-full text-left px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Delete Product Only</div>
                  <div className="text-sm text-gray-600">Keep related ingredient and recipe</div>
                </button>
                <button
                  onClick={() => handleDeleteProduct(deletingProduct, true)}
                  className="w-full text-left px-4 py-3 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="font-medium text-red-900">Delete Everywhere</div>
                  <div className="text-sm text-red-700">Also delete from Ingredients and Recipes</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}