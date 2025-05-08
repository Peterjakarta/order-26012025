import React, { useState } from 'react';
import { X, Check, AlertCircle, FilePlus, FileSpreadsheet, File as FilePdf } from 'lucide-react';

export interface ExportOptions {
  includeCosts: boolean;
  includeOverheadCosts: boolean;
  includeIngredients: boolean;
  includeNotes: boolean;
  exportFormat: 'excel' | 'pdf';
}

interface ExportOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  selectedCount: number;
}

export default function ExportOptionsDialog({
  isOpen,
  onClose,
  onExport,
  selectedCount
}: ExportOptionsDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeCosts: true,
    includeOverheadCosts: true,
    includeIngredients: true,
    includeNotes: true,
    exportFormat: 'excel'
  });
  
  if (!isOpen) return null;

  const handleOptionChange = (option: keyof ExportOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Export Options</h2>
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
                <p className="font-medium">Exporting {selectedCount} recipe{selectedCount !== 1 ? 's' : ''}</p>
                <p>Select the information to include in your export</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-800">Content Options</h3>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeIngredients}
                onChange={(e) => handleOptionChange('includeIngredients', e.target.checked)}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium">Include Ingredients</div>
                <div className="text-sm text-gray-600">List of all ingredients and their amounts</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeCosts}
                onChange={(e) => handleOptionChange('includeCosts', e.target.checked)}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium">Include Base Costs</div>
                <div className="text-sm text-gray-600">Ingredient costs and base calculations</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeOverheadCosts}
                onChange={(e) => handleOptionChange('includeOverheadCosts', e.target.checked)}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium">Include Overhead Costs</div>
                <div className="text-sm text-gray-600">Labor, electricity, equipment costs, etc.</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
              <input
                type="checkbox"
                checked={options.includeNotes}
                onChange={(e) => handleOptionChange('includeNotes', e.target.checked)}
                className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <div>
                <div className="font-medium">Include Recipe Notes</div>
                <div className="text-sm text-gray-600">Preparation instructions and additional notes</div>
              </div>
            </label>
          </div>
          
          <div className="space-y-3 pt-2">
            <h3 className="font-medium text-gray-800">Export Format</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <label 
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border 
                  ${options.exportFormat === 'excel' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  checked={options.exportFormat === 'excel'}
                  onChange={() => handleOptionChange('exportFormat', 'excel')}
                  className="sr-only"
                />
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
                <span className="font-medium">Excel</span>
              </label>
              
              <label 
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border 
                  ${options.exportFormat === 'pdf' ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'}`}
              >
                <input
                  type="radio"
                  name="exportFormat"
                  checked={options.exportFormat === 'pdf'}
                  onChange={() => handleOptionChange('exportFormat', 'pdf')}
                  className="sr-only"
                />
                <FilePdf className="w-8 h-8 text-red-600" />
                <span className="font-medium">PDF</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
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
            <FilePlus className="w-4 h-4" />
            Export Now
          </button>
        </div>
      </div>
    </div>
  );
}