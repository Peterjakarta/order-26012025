import React, { useState } from 'react';
import { X, AlertCircle, FilePlus, FileSpreadsheet } from 'lucide-react';

export interface CategoryExportOptions {
  includeProducts: boolean;
  includeProductDetails: boolean;
  includeHACCP: boolean;
  selectedCategories: string[];
}

interface CategoryExportOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: CategoryExportOptions) => void;
  categories: Record<string, { name: string; description?: string }>;
  categoryOrder: string[];
}

export default function CategoryExportOptionsDialog({
  isOpen,
  onClose,
  onExport,
  categories,
  categoryOrder
}: CategoryExportOptionsDialogProps) {
  const [options, setOptions] = useState<CategoryExportOptions>({
    includeProducts: true,
    includeProductDetails: true,
    includeHACCP: false,
    selectedCategories: []
  });

  if (!isOpen) return null;

  const handleOptionChange = (option: keyof CategoryExportOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setOptions(prev => {
      const selected = new Set(prev.selectedCategories);
      if (selected.has(categoryId)) {
        selected.delete(categoryId);
      } else {
        selected.add(categoryId);
      }
      return {
        ...prev,
        selectedCategories: Array.from(selected)
      };
    });
  };

  const handleSelectAll = () => {
    setOptions(prev => ({
      ...prev,
      selectedCategories: categoryOrder
    }));
  };

  const handleSelectNone = () => {
    setOptions(prev => ({
      ...prev,
      selectedCategories: []
    }));
  };

  const selectedCount = options.selectedCategories.length;
  const exportCount = selectedCount > 0 ? selectedCount : categoryOrder.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">Export Categories to Excel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  Exporting {exportCount} categor{exportCount !== 1 ? 'ies' : 'y'}
                </p>
                <p>Select categories and options to include in your export</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Select Categories</h3>
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

            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {categoryOrder.map(categoryId => {
                const category = categories[categoryId];
                if (!category) return null;

                const isSelected = options.selectedCategories.includes(categoryId);

                return (
                  <label
                    key={categoryId}
                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-pink-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCategoryToggle(categoryId)}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex-grow">
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-sm text-gray-600">{category.description}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Export Options</h3>

            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeProducts}
                onChange={(e) => handleOptionChange('includeProducts', e.target.checked)}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium">Include Products List</div>
                <div className="text-sm text-gray-600">List all products in each category</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeProductDetails}
                onChange={(e) => handleOptionChange('includeProductDetails', e.target.checked)}
                disabled={!options.includeProducts}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:opacity-50"
              />
              <div>
                <div className="font-medium">Include Product Details</div>
                <div className="text-sm text-gray-600">
                  Include price, unit, and other product information
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeHACCP}
                onChange={(e) => handleOptionChange('includeHACCP', e.target.checked)}
                disabled={!options.includeProducts}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 disabled:opacity-50"
              />
              <div>
                <div className="font-medium">Include HACCP Information</div>
                <div className="text-sm text-gray-600">
                  Include allergens, storage conditions, shelf life, and packing details
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onExport(options)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
