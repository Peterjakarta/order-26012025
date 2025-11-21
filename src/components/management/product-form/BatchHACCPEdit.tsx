import React, { useState } from 'react';
import { X, Save, Package, AlertCircle } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Product } from '../../../types/types';

const ALLERGEN_OPTIONS = [
  'Gluten cereals',
  'Crustacean',
  'Egg',
  'Fish',
  'Peanut',
  'Soybean',
  'Milk',
  'Tree nuts',
  'Celery',
  'Mustard',
  'Sesame',
  'Sulphites',
  'Lupin',
  'Molluscs'
];

interface BatchHACCPEditProps {
  onClose: () => void;
}

export default function BatchHACCPEdit({ onClose }: BatchHACCPEditProps) {
  const { products, categories, categoryOrder, ingredients, updateProduct } = useStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [haccpData, setHaccpData] = useState({
    internalProductionCode: '',
    productDescription: '',
    shelfLifeWeeks: '',
    awValue: '',
    storageTemperature: '',
    storageHumidity: '',
    innerPackingId: '',
    innerPackingHasDoc: false,
    outerPackingId: '',
    outerPackingHasDoc: false,
    shippingPackingId: '',
    shippingPackingHasDoc: false
  });

  const [fieldsToUpdate, setFieldsToUpdate] = useState({
    internalProductionCode: false,
    productDescription: false,
    shelfLifeWeeks: false,
    awValue: false,
    storageTemperature: false,
    storageHumidity: false,
    allergens: false,
    innerPackingId: false,
    innerPackingHasDoc: false,
    outerPackingId: false,
    outerPackingHasDoc: false,
    shippingPackingId: false,
    shippingPackingHasDoc: false
  });

  const shelfLifeOptions = [
    ...Array.from({ length: 20 }, (_, i) => ({ value: i + 1, label: `${i + 1} ${i + 1 === 1 ? 'week' : 'weeks'}` })),
    { value: 26, label: '6 months' },
    { value: 52, label: '12 months' },
    { value: 78, label: '18 months' },
    { value: 104, label: '24 months' }
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev => {
      if (prev.includes(allergen)) {
        return prev.filter(a => a !== allergen);
      } else {
        return [...prev, allergen];
      }
    });
  };

  const handleFieldToggle = (field: keyof typeof fieldsToUpdate) => {
    setFieldsToUpdate(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSelectAll = () => {
    setSelectedCategories(categoryOrder);
  };

  const handleSelectNone = () => {
    setSelectedCategories([]);
  };

  const affectedProductsCount = products.filter(p =>
    selectedCategories.includes(p.category)
  ).length;

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one category');
      return;
    }

    const selectedFieldsCount = Object.values(fieldsToUpdate).filter(v => v).length;
    if (selectedFieldsCount === 0) {
      alert('Please select at least one field to update');
      return;
    }

    const confirmMessage = `This will update ${selectedFieldsCount} HACCP field(s) for ${affectedProductsCount} product(s) across ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}. Continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);

    try {
      const productsToUpdate = products.filter(p =>
        selectedCategories.includes(p.category)
      );

      console.log('Batch HACCP Edit - Starting update for', productsToUpdate.length, 'products');
      console.log('Fields to update:', fieldsToUpdate);
      console.log('HACCP data:', haccpData);

      let successCount = 0;
      let errorCount = 0;

      for (const product of productsToUpdate) {
        try {
          const updatedHaccp = { ...(product.haccp || {}) };

          if (fieldsToUpdate.internalProductionCode) {
            updatedHaccp.internalProductionCode = haccpData.internalProductionCode;
          }
          if (fieldsToUpdate.productDescription) {
            updatedHaccp.productDescription = haccpData.productDescription;
          }
          if (fieldsToUpdate.shelfLifeWeeks) {
            updatedHaccp.shelfLifeWeeks = haccpData.shelfLifeWeeks ? parseInt(haccpData.shelfLifeWeeks) : undefined;
          }
          if (fieldsToUpdate.awValue) {
            updatedHaccp.awValue = haccpData.awValue;
          }
          if (fieldsToUpdate.storageTemperature) {
            updatedHaccp.storageTemperature = haccpData.storageTemperature;
          }
          if (fieldsToUpdate.storageHumidity) {
            updatedHaccp.storageHumidity = haccpData.storageHumidity;
          }
          if (fieldsToUpdate.allergens) {
            updatedHaccp.allergens = selectedAllergens;
          }
          if (fieldsToUpdate.innerPackingId) {
            updatedHaccp.innerPackingId = haccpData.innerPackingId || '';
          }
          if (fieldsToUpdate.innerPackingHasDoc) {
            updatedHaccp.innerPackingHasDoc = haccpData.innerPackingHasDoc;
          }
          if (fieldsToUpdate.outerPackingId) {
            updatedHaccp.outerPackingId = haccpData.outerPackingId || '';
          }
          if (fieldsToUpdate.outerPackingHasDoc) {
            updatedHaccp.outerPackingHasDoc = haccpData.outerPackingHasDoc;
          }
          if (fieldsToUpdate.shippingPackingId) {
            updatedHaccp.shippingPackingId = haccpData.shippingPackingId || '';
          }
          if (fieldsToUpdate.shippingPackingHasDoc) {
            updatedHaccp.shippingPackingHasDoc = haccpData.shippingPackingHasDoc;
          }

          console.log(`Updating product ${product.name} (${product.id}) with HACCP:`, updatedHaccp);

          const { id, ...productWithoutId } = product;
          await updateProduct(id, {
            ...productWithoutId,
            haccp: updatedHaccp
          });

          successCount++;
          console.log(`Successfully updated product ${product.name}`);
        } catch (productError) {
          errorCount++;
          console.error(`Error updating product ${product.name}:`, productError);
        }
      }

      if (errorCount > 0) {
        alert(`Updated ${successCount} product(s). Failed to update ${errorCount} product(s). Check console for details.`);
      } else {
        alert(`Successfully updated ${successCount} product(s)`);
      }

      onClose();
    } catch (error) {
      console.error('Error in batch HACCP update:', error);
      alert(`Failed to update products. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-pink-600" />
            <h2 className="text-xl font-semibold">Batch Edit HACCP Information</h2>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Select Categories</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {categoryOrder.map(categoryId => {
                const category = categories[categoryId];
                const productsCount = products.filter(p => p.category === categoryId).length;

                return (
                  <label
                    key={categoryId}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                      selectedCategories.includes(categoryId) ? 'bg-pink-50 border-pink-300' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(categoryId)}
                      onChange={() => handleCategoryToggle(categoryId)}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow min-w-0">
                      <div className="font-medium text-sm truncate">{category.name}</div>
                      <div className="text-xs text-gray-500">{productsCount} products</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {affectedProductsCount > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">
                      {affectedProductsCount} product{affectedProductsCount !== 1 ? 's' : ''} will be updated
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HACCP Fields */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">HACCP Fields to Update</h3>
            <p className="text-sm text-gray-600">Select which fields to update and provide values</p>

            <div className="space-y-4">
              {/* Internal Production Code */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.internalProductionCode}
                  onChange={() => handleFieldToggle('internalProductionCode')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Production Code
                  </label>
                  <input
                    type="text"
                    value={haccpData.internalProductionCode}
                    onChange={(e) => setHaccpData({ ...haccpData, internalProductionCode: e.target.value })}
                    disabled={!fieldsToUpdate.internalProductionCode}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                    placeholder="e.g., PRD-001"
                  />
                </div>
              </div>

              {/* Product Description */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.productDescription}
                  onChange={() => handleFieldToggle('productDescription')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    value={haccpData.productDescription}
                    onChange={(e) => setHaccpData({ ...haccpData, productDescription: e.target.value })}
                    disabled={!fieldsToUpdate.productDescription}
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                    placeholder="Detailed product description for HACCP"
                  />
                </div>
              </div>

              {/* Shelf Life */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.shelfLifeWeeks}
                  onChange={() => handleFieldToggle('shelfLifeWeeks')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shelf Life
                  </label>
                  <select
                    value={haccpData.shelfLifeWeeks}
                    onChange={(e) => setHaccpData({ ...haccpData, shelfLifeWeeks: e.target.value })}
                    disabled={!fieldsToUpdate.shelfLifeWeeks}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                  >
                    <option value="">Select shelf life</option>
                    {shelfLifeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AW Value */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.awValue}
                  onChange={() => handleFieldToggle('awValue')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AW Value
                  </label>
                  <input
                    type="text"
                    value={haccpData.awValue}
                    onChange={(e) => setHaccpData({ ...haccpData, awValue: e.target.value })}
                    disabled={!fieldsToUpdate.awValue}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                    placeholder="e.g., 0.85"
                  />
                </div>
              </div>

              {/* Storage Temperature */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.storageTemperature}
                  onChange={() => handleFieldToggle('storageTemperature')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Temperature
                  </label>
                  <input
                    type="text"
                    value={haccpData.storageTemperature}
                    onChange={(e) => setHaccpData({ ...haccpData, storageTemperature: e.target.value })}
                    disabled={!fieldsToUpdate.storageTemperature}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                    placeholder="e.g., 15-20°C"
                  />
                </div>
              </div>

              {/* Storage Humidity */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.storageHumidity}
                  onChange={() => handleFieldToggle('storageHumidity')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Humidity
                  </label>
                  <input
                    type="text"
                    value={haccpData.storageHumidity}
                    onChange={(e) => setHaccpData({ ...haccpData, storageHumidity: e.target.value })}
                    disabled={!fieldsToUpdate.storageHumidity}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                    placeholder="e.g., 40-60%"
                  />
                </div>
              </div>

              {/* Allergens */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.allergens}
                  onChange={() => handleFieldToggle('allergens')}
                  className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <div className="flex-grow">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allergens
                  </label>
                  <div className={`border rounded-lg p-3 ${!fieldsToUpdate.allergens ? 'bg-gray-100' : ''}`}>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {ALLERGEN_OPTIONS.map((allergen) => (
                        <label
                          key={allergen}
                          className={`flex items-center gap-2 text-sm ${!fieldsToUpdate.allergens ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAllergens.includes(allergen)}
                            onChange={() => toggleAllergen(allergen)}
                            disabled={!fieldsToUpdate.allergens}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                          <span>{allergen}</span>
                        </label>
                      ))}
                    </div>
                    {fieldsToUpdate.allergens && selectedAllergens.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex flex-wrap gap-1">
                          {selectedAllergens.map((allergen) => (
                            <span
                              key={allergen}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                            >
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Packing Information */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Packing Information</h4>

                <div className="space-y-4">
                  {/* Inner Packing */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.innerPackingId}
                      onChange={() => handleFieldToggle('innerPackingId')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inner Packing
                      </label>
                      <select
                        value={haccpData.innerPackingId}
                        onChange={(e) => setHaccpData({ ...haccpData, innerPackingId: e.target.value })}
                        disabled={!fieldsToUpdate.innerPackingId}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                      >
                        <option value="">Select Inner Packing</option>
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Inner Packing Has Doc */}
                  <div className="flex items-start gap-3 ml-8">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.innerPackingHasDoc}
                      onChange={() => handleFieldToggle('innerPackingHasDoc')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={haccpData.innerPackingHasDoc}
                          onChange={(e) => setHaccpData({ ...haccpData, innerPackingHasDoc: e.target.checked })}
                          disabled={!fieldsToUpdate.innerPackingHasDoc}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:bg-gray-100"
                        />
                        <span>Has Documentation</span>
                      </label>
                    </div>
                  </div>

                  {/* Outer Packing */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.outerPackingId}
                      onChange={() => handleFieldToggle('outerPackingId')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outer Packing
                      </label>
                      <select
                        value={haccpData.outerPackingId}
                        onChange={(e) => setHaccpData({ ...haccpData, outerPackingId: e.target.value })}
                        disabled={!fieldsToUpdate.outerPackingId}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                      >
                        <option value="">Select Outer Packing</option>
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Outer Packing Has Doc */}
                  <div className="flex items-start gap-3 ml-8">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.outerPackingHasDoc}
                      onChange={() => handleFieldToggle('outerPackingHasDoc')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={haccpData.outerPackingHasDoc}
                          onChange={(e) => setHaccpData({ ...haccpData, outerPackingHasDoc: e.target.checked })}
                          disabled={!fieldsToUpdate.outerPackingHasDoc}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:bg-gray-100"
                        />
                        <span>Has Documentation</span>
                      </label>
                    </div>
                  </div>

                  {/* Shipping Packing */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.shippingPackingId}
                      onChange={() => handleFieldToggle('shippingPackingId')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping Packing
                      </label>
                      <select
                        value={haccpData.shippingPackingId}
                        onChange={(e) => setHaccpData({ ...haccpData, shippingPackingId: e.target.value })}
                        disabled={!fieldsToUpdate.shippingPackingId}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 disabled:bg-gray-100"
                      >
                        <option value="">Select Shipping Packing</option>
                        {ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Shipping Packing Has Doc */}
                  <div className="flex items-start gap-3 ml-8">
                    <input
                      type="checkbox"
                      checked={fieldsToUpdate.shippingPackingHasDoc}
                      onChange={() => handleFieldToggle('shippingPackingHasDoc')}
                      className="mt-2 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={haccpData.shippingPackingHasDoc}
                          onChange={(e) => setHaccpData({ ...haccpData, shippingPackingHasDoc: e.target.checked })}
                          disabled={!fieldsToUpdate.shippingPackingHasDoc}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:bg-gray-100"
                        />
                        <span>Has Documentation</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || selectedCategories.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isProcessing ? 'Updating...' : `Update ${affectedProductsCount} Product${affectedProductsCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
