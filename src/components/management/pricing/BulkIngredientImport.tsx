import React, { useState } from 'react';
import { Upload, AlertCircle, Copy, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import type { Ingredient } from '../../../types/types';

interface BulkIngredientImportProps {
  onImport: (ingredients: Omit<Ingredient, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

const EXAMPLE_CSV = `Name,Usage Unit,Package Size,Package Unit,Price (IDR)
Dark Chocolate 70%,grams,1000,kg,150000
Milk Chocolate 35%,grams,1000,kg,120000
Cocoa Butter,grams,500,kg,180000`;

const REQUIRED_COLUMNS = ['name', 'usage unit', 'package size', 'package unit', 'price'];

export default function BulkIngredientImport({ onImport, onClose }: BulkIngredientImportProps) {
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
    // Normalize headers for comparison
    const normalizedHeaders = headers.map(header => 
      header.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );

    // Check for required columns
    const missingColumns = REQUIRED_COLUMNS.filter(required => 
      !normalizedHeaders.some(header => header.includes(required))
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing required columns: ${missingColumns.join(', ')}. \n` +
        `Required columns are: ${REQUIRED_COLUMNS.join(', ')}`
      );
    }

    return headers;
  };

  const parseNumber = (value: string, fieldName: string): number => {
    // Remove any currency symbols and commas
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const number = parseFloat(cleanValue);
    
    if (isNaN(number)) {
      throw new Error(`Invalid ${fieldName}: ${value}`);
    }
    
    return number;
  };

  const validateAndTransformRow = (row: Record<string, string>, rowIndex: number): Omit<Ingredient, 'id'> => {
    const errors: string[] = [];
    let ingredient: Partial<Omit<Ingredient, 'id'>> = {};

    try {
      // Validate name
      const name = row['Name']?.trim() || row['name']?.trim();
      if (!name) {
        errors.push('Name is required');
      }
      ingredient.name = name;

      // Validate usage unit
      const unit = row['Usage Unit']?.trim() || row['usage unit']?.trim() || row['Unit']?.trim();
      if (!unit) {
        errors.push('Usage Unit is required');
      }
      ingredient.unit = unit;

      // Validate package size
      const packageSizeStr = row['Package Size']?.trim() || row['package size']?.trim();
      if (!packageSizeStr) {
        errors.push('Package Size is required');
      } else {
        const packageSize = parseNumber(packageSizeStr, 'Package Size');
        if (packageSize <= 0) {
          errors.push('Package Size must be greater than 0');
        }
        ingredient.packageSize = packageSize;
      }

      // Validate package unit
      const packageUnit = row['Package Unit']?.trim() || row['package unit']?.trim();
      if (!packageUnit) {
        errors.push('Package Unit is required');
      }
      ingredient.packageUnit = packageUnit;

      // Validate price
      const priceStr = row['Price (IDR)']?.trim() || row['price']?.trim() || row['Price']?.trim();
      if (!priceStr) {
        errors.push('Price is required');
      } else {
        const price = parseNumber(priceStr, 'Price');
        if (price < 0) {
          errors.push('Price cannot be negative');
        }
        ingredient.price = price;
      }

      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      return ingredient as Omit<Ingredient, 'id'>;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`Row ${rowIndex + 1}${ingredient.name ? ` (${ingredient.name})` : ''}: \n${errorMessage}`);
    }
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('Please enter CSV data');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // Parse CSV
      const result = Papa.parse(csvData.trim(), {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim()
      });

      // Check for parsing errors
      if (result.errors.length > 0) {
        const errorMessages = result.errors
          .map(err => `Line ${err.row + 1}: ${err.message}`)
          .join('\n');
        throw new Error(`CSV parsing errors:\n${errorMessages}`);
      }

      // Validate headers
      validateHeaders(result.meta.fields || []);

      // Validate data is present
      if (!result.data || result.data.length === 0) {
        throw new Error('No data found in CSV');
      }

      // Validate and transform each row
      const ingredients: Omit<Ingredient, 'id'>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < result.data.length; i++) {
        try {
          const ingredient = validateAndTransformRow(result.data[i] as Record<string, string>, i);
          ingredients.push(ingredient);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `Error in row ${i + 1}`);
        }
      }

      // If there were any errors, throw them all together
      if (errors.length > 0) {
        throw new Error(`Validation errors:\n${errors.join('\n')}`);
      }

      // Import ingredients
      await onImport(ingredients);
      onClose();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import ingredients');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">Bulk Import Ingredients</h3>
          <p className="text-sm text-gray-500 mt-1">
            Import multiple ingredients using CSV format
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
          Name, Usage Unit, Package Size, Package Unit, Price (IDR)
        </p>
        <div className="relative">
          <textarea
            value={csvData}
            onChange={(e) => {
              setCsvData(e.target.value);
              setError(''); // Clear error when input changes
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
          {importing ? 'Importing...' : 'Import Ingredients'}
        </button>
      </div>
    </div>
  );
}