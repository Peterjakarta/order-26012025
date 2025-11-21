import React, { useState } from 'react';
import { X, Save, FileText, Check } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Product } from '../../../types/types';

interface BatchInternalCodeEditProps {
  onClose: () => void;
}

export default function BatchInternalCodeEdit({ onClose }: BatchInternalCodeEditProps) {
  const { products, categories, categoryOrder, updateProduct } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [internalCodes, setInternalCodes] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());

  const categoryProducts = products.filter(p => p.category === selectedCategory);

  const handleCodeChange = (productId: string, code: string) => {
    setInternalCodes(prev => ({
      ...prev,
      [productId]: code
    }));
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const code = internalCodes[product.id] || product.haccp?.internalProductionCode || '';

      const updatedHaccp = {
        ...(product.haccp || {}),
        internalProductionCode: code
      };

      const { id, ...productWithoutId } = product;
      await updateProduct(id, {
        ...productWithoutId,
        haccp: updatedHaccp
      });

      setSavedProducts(prev => new Set(prev).add(product.id));

      // Remove from saved set after 2 seconds
      setTimeout(() => {
        setSavedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(product.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Error saving product:', error);
      alert(`Failed to save ${product.name}. Please try again.`);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }

    if (categoryProducts.length === 0) {
      alert('No products found in this category');
      return;
    }

    const confirmMessage = `Save Internal Production Codes for all ${categoryProducts.length} product(s) in this category?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const product of categoryProducts) {
        try {
          const code = internalCodes[product.id] || product.haccp?.internalProductionCode || '';

          const updatedHaccp = {
            ...(product.haccp || {}),
            internalProductionCode: code
          };

          const { id, ...productWithoutId } = product;
          await updateProduct(id, {
            ...productWithoutId,
            haccp: updatedHaccp
          });

          successCount++;
        } catch (productError) {
          errorCount++;
          console.error(`Error updating product ${product.name}:`, productError);
        }
      }

      if (errorCount > 0) {
        alert(`Saved ${successCount} product(s). Failed to save ${errorCount} product(s).`);
      } else {
        alert(`Successfully saved ${successCount} product(s)`);
        onClose();
      }
    } catch (error) {
      console.error('Error in batch save:', error);
      alert(`Failed to save products. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDisplayCode = (product: Product) => {
    if (internalCodes[product.id] !== undefined) {
      return internalCodes[product.id];
    }
    return product.haccp?.internalProductionCode || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold">Batch Edit Internal Production Codes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Category Selection */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              <option value="">Choose a category...</option>
              {categoryOrder.map(categoryId => (
                <option key={categoryId} value={categoryId}>
                  {categories[categoryId]?.name || categoryId} ({products.filter(p => p.category === categoryId).length} products)
                </option>
              ))}
            </select>
          </div>

          {/* Products List */}
          {selectedCategory && categoryProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">
                  Products in {categories[selectedCategory]?.name} ({categoryProducts.length})
                </h3>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {categoryProducts.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {product.name}
                        </label>
                        <input
                          type="text"
                          value={getDisplayCode(product)}
                          onChange={(e) => handleCodeChange(product.id, e.target.value)}
                          placeholder="Enter internal production code"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveProduct(product)}
                        disabled={isProcessing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                          savedProducts.has(product.id)
                            ? 'bg-green-600 text-white'
                            : 'bg-pink-600 text-white hover:bg-pink-700'
                        } disabled:opacity-50`}
                      >
                        {savedProducts.has(product.id) ? (
                          <>
                            <Check className="w-4 h-4" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCategory && categoryProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products found in this category
            </div>
          )}

          {!selectedCategory && (
            <div className="text-center py-8 text-gray-500">
              Please select a category to view products
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Close
          </button>

          {selectedCategory && categoryProducts.length > 0 && (
            <button
              onClick={handleSaveAll}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isProcessing ? 'Saving...' : 'Save All'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
