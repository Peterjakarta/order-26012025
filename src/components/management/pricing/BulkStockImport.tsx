import React, { useState } from 'react';
import { Upload, AlertCircle, Copy, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import { useStore } from '../../../store/StoreContext';
import type { StockCategory } from '../../../types/types';

interface BulkStockImportProps {
  category: StockCategory;
  onClose: () => void;
}

// Example CSV with exact column names
const EXAMPLE_CSV = `Ingredient,Current Stock,Unit,Min Stock,Package Size,Package Unit,Cost
Dark Chocolate 70%,1000,grams,500,1000,kg,150000
Milk Chocolate 35%,800,grams,400,1000,kg,120000
Cocoa Butter,500,grams,200,500,kg,180000`;

export default function BulkStockImport({ category, onClose }: BulkStockImportProps) {
  const { ingredients, updateStockLevel, updateIngredientCategories } = useStore();
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateHeaders = (headers: string[]): string[] | Error => {
    // These must match EXACTLY with the CSV headers
    const REQUIRED_HEADERS = [
      'Ingredient',
      'Current Stock',
      'Unit',
      'Min Stock', 
      'Package Size',
      'Package Unit',
      'Cost'
    ];

    // Check for missing headers - exact match required
    const missingHeaders = REQUIRED_HEADERS.filter(required => 
      !headers.includes(required)
    );

    if (missingHeaders.length > 0) {
      throw new Error(
        `Missing required columns: ${missingHeaders.join(', ')}. \n` +
        `Required columns are: ${REQUIRED_HEADERS.join(', ')}`
      );
    }

    return headers;
  };

  const parseNumber = (value: string, fieldName: string): number => {
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const number = parseFloat(cleanValue);
    
    if (isNaN(number)) {
      throw new Error(`Invalid ${fieldName}: ${value}`);
    }
    
    return number;
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('Please enter CSV data');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // Parse CSV with exact header matching
      const result = Papa.parse(csvData.trim(), {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim() // Only trim whitespace
      });

      // Check for parsing errors
      if (result.errors.length > 0) {
        const errorMessages = result.errors
          .map(err => `Line ${err.row + 1}: ${err.message}`)
          .join('\n');
        throw new Error(`CSV parsing errors:\n${errorMessages}`);
      }

      // Validate headers - must match exactly
      validateHeaders(result.meta.fields || []);

      // Keep track of ingredients to add to category
      const ingredientIds: string[] = [];

      // Process each row
      for (const row of result.data as Record<string, string>[]) {
        const ingredientName = row['Ingredient']?.trim();
        const ingredient = ingredients.find(i => i.name === ingredientName);

        if (!ingredient) {
          throw new Error(`Ingredient not found: ${ingredientName}`);
        }

        // Add ingredient ID to the list
        ingredientIds.push(ingredient.id);

        // Validate units match exactly
        const unit = row['Unit']?.trim();
        const packageUnit = row['Package Unit']?.trim();
        
        if (unit !== ingredient.unit) {
          throw new Error(`Unit mismatch for ${ingredientName}: expected ${ingredient.unit}, got ${unit}`);
        }

        if (packageUnit !== ingredient.packageUnit) {
          throw new Error(`Package unit mismatch for ${ingredientName}: expected ${ingredient.packageUnit}, got ${packageUnit}`);
        }

        // Parse numeric values
        const currentStock = parseNumber(row['Current Stock'], 'Current Stock');
        const minStock = parseNumber(row['Min Stock'], 'Min Stock');
        const packageSize = parseNumber(row['Package Size'], 'Package Size');
        const cost = parseNumber(row['Cost'], 'Cost');

        // Validate values
        if (currentStock < 0) {
          throw new Error(`Current stock cannot be negative for ${ingredientName}`);
        }

        if (minStock < 0) {
          throw new Error(`Min stock cannot be negative for ${ingredientName}`);
        }

        if (packageSize !== ingredient.packageSize) {
          throw new Error(`Package size mismatch for ${ingredientName}: expected ${ingredient.packageSize}, got ${packageSize}`);
        }

        if (cost !== ingredient.price) {
          throw new Error(`Cost mismatch for ${ingredientName}: expected ${ingredient.price}, got ${cost}`);
        }

        // Update stock level
        await updateStockLevel(ingredient.id, {
          quantity: currentStock,
          minStock: minStock,
          changeType: 'manual'
        });
      }

      // Add ingredients to category
      await updateIngredientCategories(category.id, ingredientIds);

      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import stock levels');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Bulk Import Stock Levels</h3>
          <p className="text-sm text-gray-500 mt-1">
            Import stock levels for {category.name}
          </p>
        </div>
        <button
          onClick={handleCopyExample}
          className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Example</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          CSV Data
        </label>
        <p className="text-sm text-gray-500">
          Paste your CSV data with the following columns:
          <br />
          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            Ingredient, Current Stock, Unit, Min Stock, Package Size, Package Unit, Cost
          </code>
        </p>
        <div className="relative">
          <textarea
            value={csvData}
            onChange={(e) => {
              setCsvData(e.target.value);
              setError('');
            }}
            className="w-full h-64 p-2 border rounded-md font-mono text-sm"
            placeholder="Paste CSV data here..."
          />
          {csvData && (
            <button
              onClick={() => {
                setCsvData('');
                setError('');
              }}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <pre className="text-sm whitespace-pre-wrap font-mono">{error}</pre>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={importing || !csvData.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importing...' : 'Import Stock Levels'}
        </button>
      </div>
    </div>
  );
}