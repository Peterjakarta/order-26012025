import React, { useState } from 'react';
import { X, FileDown, FileSpreadsheet, File as FilePdf, AlertCircle, Check, BookOpen } from 'lucide-react';
import { Order, Product, Recipe, Ingredient } from '../../../types/types';

export interface ReportExportOptions {
  content: {
    products: boolean;
    ingredients: boolean;
    materialCosts: boolean;
    productionCosts: boolean;
    overheadCosts: boolean;
    qualityControl: boolean;
    notes: boolean;
  };
  organization: 'individual' | 'consolidated';
  format: 'detailed' | 'summary' | 'custom';
  fileType: 'excel' | 'pdf';
}

interface ReportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ReportExportOptions) => void;
  selectedOrders: Order[];
  startDate: string;
  endDate: string;
}

const defaultOptions: ReportExportOptions = {
  content: {
    products: true,
    ingredients: true,
    materialCosts: true,
    productionCosts: true,
    overheadCosts: true,
    qualityControl: true,
    notes: true
  },
  organization: 'consolidated',
  format: 'detailed',
  fileType: 'excel'
};

export default function ReportExportDialog({
  isOpen,
  onClose,
  onExport,
  selectedOrders,
  startDate,
  endDate
}: ReportExportDialogProps) {
  const [options, setOptions] = useState<ReportExportOptions>(defaultOptions);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  const handleContentOptionChange = (key: keyof ReportExportOptions['content']) => {
    setOptions(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: !prev.content[key]
      }
    }));
  };

  const handleFormatChange = (format: ReportExportOptions['format']) => {
    if (format === 'detailed') {
      // Set all content options to true for detailed view
      setOptions(prev => ({
        ...prev,
        format,
        content: {
          products: true,
          ingredients: true,
          materialCosts: true,
          productionCosts: true,
          overheadCosts: true,
          qualityControl: true,
          notes: true
        }
      }));
    } else if (format === 'summary') {
      // Focus on totals only for summary
      setOptions(prev => ({
        ...prev,
        format,
        content: {
          products: true,
          ingredients: true,
          materialCosts: true,
          productionCosts: true,
          overheadCosts: false,
          qualityControl: true,
          notes: false
        }
      }));
    } else {
      // Custom - don't change content options
      setOptions(prev => ({
        ...prev,
        format
      }));
    }
  };

  const handleNextStep = () => {
    setStep(prev => (prev === 3 ? prev : (prev + 1) as 1 | 2 | 3));
  };

  const handlePrevStep = () => {
    setStep(prev => (prev === 1 ? prev : (prev - 1) as 1 | 2 | 3));
  };

  const handleExport = () => {
    onExport(options);
  };

  const dateRangeText = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
    : 'All dates';

  const selectedOrdersText = selectedOrders.length > 0
    ? `${selectedOrders.length} orders selected`
    : 'All orders';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">Export Production Report</h2>
            <p className="text-sm text-gray-600">
              {dateRangeText} • {selectedOrdersText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-pink-500' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-pink-500' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {step === 1 && 'Select Content'}
              {step === 2 && 'Organization & Format'}
              {step === 3 && 'Review & Export'}
            </div>
          </div>
        </div>

        {/* Content selection step */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg text-blue-800 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">Select what information to include in your report. You can customize these options in the next steps.</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Report Content</h3>
              
              <div className="grid gap-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Products and Quantities</span>
                    <p className="text-sm text-gray-500">List of all products produced with quantities</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.products}
                    onChange={() => handleContentOptionChange('products')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Raw Ingredients Breakdown</span>
                    <p className="text-sm text-gray-500">Detailed list of all ingredients used</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.ingredients}
                    onChange={() => handleContentOptionChange('ingredients')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Material Costs</span>
                    <p className="text-sm text-gray-500">Cost of raw ingredients used</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.materialCosts}
                    onChange={() => handleContentOptionChange('materialCosts')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Production Costs</span>
                    <p className="text-sm text-gray-500">Labor and direct production expenses</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.productionCosts}
                    onChange={() => handleContentOptionChange('productionCosts')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Overhead Costs</span>
                    <p className="text-sm text-gray-500">Equipment, electricity and other overhead</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.overheadCosts}
                    onChange={() => handleContentOptionChange('overheadCosts')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Quality Control Data</span>
                    <p className="text-sm text-gray-500">Rejection rates, waste, and QC notes</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.qualityControl}
                    onChange={() => handleContentOptionChange('qualityControl')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <div>
                    <span className="font-medium">Order Notes and Comments</span>
                    <p className="text-sm text-gray-500">Special instructions and additional information</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={options.content.notes}
                    onChange={() => handleContentOptionChange('notes')}
                    className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Organization and format step */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-4">Report Organization</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.organization === 'individual' 
                    ? 'bg-pink-50 border-pink-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="organization"
                    checked={options.organization === 'individual'}
                    onChange={() => setOptions(prev => ({ ...prev, organization: 'individual' }))}
                    className="sr-only"
                  />
                  <div className="h-20 w-20 mb-4 flex items-center justify-center bg-pink-100 rounded-lg">
                    <BookOpen className="w-10 h-10 text-pink-500" />
                  </div>
                  <span className="font-medium">Individual Orders</span>
                  <p className="text-xs text-center text-gray-500 mt-2">Each order shown separately with its details</p>
                </label>

                <label className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.organization === 'consolidated' 
                    ? 'bg-pink-50 border-pink-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="organization"
                    checked={options.organization === 'consolidated'}
                    onChange={() => setOptions(prev => ({ ...prev, organization: 'consolidated' }))}
                    className="sr-only"
                  />
                  <div className="h-20 w-20 mb-4 flex items-center justify-center bg-pink-100 rounded-lg">
                    <FileDown className="w-10 h-10 text-pink-500" />
                  </div>
                  <span className="font-medium">Consolidated Summary</span>
                  <p className="text-xs text-center text-gray-500 mt-2">Combined data from all selected orders</p>
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-4">Report Format</h3>
              <div className="grid grid-cols-3 gap-4">
                <label className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.format === 'detailed' 
                    ? 'bg-pink-50 border-pink-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    checked={options.format === 'detailed'}
                    onChange={() => handleFormatChange('detailed')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium mb-1">Detailed</div>
                    <p className="text-xs text-gray-500">All available information and metrics</p>
                  </div>
                </label>

                <label className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.format === 'summary' 
                    ? 'bg-pink-50 border-pink-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    checked={options.format === 'summary'}
                    onChange={() => handleFormatChange('summary')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium mb-1">Summary</div>
                    <p className="text-xs text-gray-500">Only totals and key metrics</p>
                  </div>
                </label>

                <label className={`flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.format === 'custom' 
                    ? 'bg-pink-50 border-pink-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="format"
                    checked={options.format === 'custom'}
                    onChange={() => handleFormatChange('custom')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-medium mb-1">Custom</div>
                    <p className="text-xs text-gray-500">Your selected components</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-4">File Format</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.fileType === 'excel' 
                    ? 'bg-green-50 border-green-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="fileType"
                    checked={options.fileType === 'excel'}
                    onChange={() => setOptions(prev => ({ ...prev, fileType: 'excel' }))}
                    className="sr-only"
                  />
                  <FileSpreadsheet className="w-8 h-8 mr-4 text-green-600" />
                  <span className="font-medium">Excel</span>
                </label>

                <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                  options.fileType === 'pdf' 
                    ? 'bg-red-50 border-red-300' 
                    : 'hover:bg-gray-50 border-gray-200'
                }`}>
                  <input
                    type="radio"
                    name="fileType"
                    checked={options.fileType === 'pdf'}
                    onChange={() => setOptions(prev => ({ ...prev, fileType: 'pdf' }))}
                    className="sr-only"
                  />
                  <FilePdf className="w-8 h-8 mr-4 text-red-600" />
                  <span className="font-medium">PDF</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Review and export step */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800">Your report is ready to export</h3>
                <p className="text-sm text-green-700">Review your selections below and click Export to generate your report.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Report Content</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.products ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.products ? 'text-gray-700' : 'text-gray-400'}`}>Products and Quantities</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.ingredients ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.ingredients ? 'text-gray-700' : 'text-gray-400'}`}>Raw Ingredients</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.materialCosts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.materialCosts ? 'text-gray-700' : 'text-gray-400'}`}>Material Costs</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.productionCosts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.productionCosts ? 'text-gray-700' : 'text-gray-400'}`}>Production Costs</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.overheadCosts ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.overheadCosts ? 'text-gray-700' : 'text-gray-400'}`}>Overhead Costs</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.qualityControl ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.qualityControl ? 'text-gray-700' : 'text-gray-400'}`}>Quality Control Data</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-2 ${options.content.notes ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm ${options.content.notes ? 'text-gray-700' : 'text-gray-400'}`}>Notes and Comments</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Organization</h3>
                  <p className="text-sm">
                    {options.organization === 'individual' 
                      ? 'Individual Orders (Separate)' 
                      : 'Consolidated Summary (Combined)'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Format</h3>
                  <p className="text-sm">
                    {options.format === 'detailed' 
                      ? 'Detailed (All Information)' 
                      : options.format === 'summary'
                        ? 'Summary (Totals Only)'
                        : 'Custom (Selected Information)'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">File Type</h3>
                <div className="flex items-center gap-2">
                  {options.fileType === 'excel' ? (
                    <>
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Excel Spreadsheet (.xlsx)</span>
                    </>
                  ) : (
                    <>
                      <FilePdf className="w-5 h-5 text-red-600" />
                      <span className="text-sm">PDF Document (.pdf)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer with navigation buttons */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <button
            onClick={step === 1 ? onClose : handlePrevStep}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div>
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Export Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}