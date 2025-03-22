import React, { useState } from 'react';
import { Upload, AlertCircle, Copy, Check } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Product, ProductCategory } from '../../../types/types';

interface BulkProductImportProps {
  category?: string;
  onComplete: () => void;
}

// Example CSV with exact column names
const EXAMPLE_CSV = `Name,Description,Unit,Min Order,Price,Show Price,Show Description,Show Unit,Show Min Order,Quantity Step
Dark Chocolate Truffles,Premium dark chocolate truffles,boxes,5,24.99,true,true,true,true,
Milk Chocolate Bars,Creamy milk chocolate bars,cases,3,19.99,true,false,true,false,
Classic Pralines,Belgian-style pralines,boxes,4,27.99,true,true,true,true,
Champagne Truffles,Marc de Champagne truffles,boxes,5,29.99,true,true,true,true,
Single Origin Dark Bar,Madagascar 85% dark chocolate,cases,3,22.99,true,true,true,false,`;

export default function BulkProductImport({ category: initialCategory, onComplete }: BulkProductImportProps) {
  const { addProduct, categories } = useStore();
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateHeaders = (headers: string[]): string[] | Error => {
    // These must match EXACTLY with the CSV headers
    const REQUIRED_HEADERS = [
      'Name',
      'Description',
      'Unit',
      'Min Order',
      'Price',
      'Show Price',
      'Show Description',
      'Show Unit',
      'Show Min Order'
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

  const parseBoolean = (value: string): boolean => {
    const lowered = value.toLowerCase().trim();
    return lowered === 'true' || lowered === 'yes' || lowered === '1';
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
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    if (!csvData.trim()) {
      setError('Please enter CSV data');
      return;
    }

    try {
      setImporting(true);
      setError('');

      // Split CSV into lines and parse headers
      const lines = csvData.trim().split('\n').map(line => line.trim());
      const headers = lines[0].split(',').map(header => header.trim());

      // Validate headers
      validateHeaders(headers);

      // Process each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(',').map(val => val.trim());
        
        // Validate line has correct number of columns
        if (values.length !== headers.length) {
          throw new Error(`Line ${i + 1} has incorrect number of columns`);
        }

        // Create object from headers and values
        const data = headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as Record<string, string>);

        // Create product data with validation
        const productData: Omit<Product, 'id'> = {
          name: data['Name'],
          category: selectedCategory as ProductCategory,
          description: data['Description'] || '',
          unit: data['Unit'] || 'pcs',
          minOrder: parseNumber(data['Min Order'] || '1', 'Min Order'),
          price: parseNumber(data['Price'] || '0', 'Price'),
          quantityStep: data['Quantity Step'] ? parseNumber(data['Quantity Step'], 'Quantity Step') : undefined,
          showPrice: parseBoolean(data['Show Price']),
          showDescription: parseBoolean(data['Show Description']),
          showUnit: parseBoolean(data['Show Unit']),
          showMinOrder: parseBoolean(data['Show Min Order'])
        };

        // Validate required fields
        if (!productData.name) {
          throw new Error(`Line ${i + 1}: Product name is required`);
        }

        // Add product
        await addProduct(productData);
      }

      setCsvData('');
      onComplete();
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bulk Import Products
        </label>

        {/* Category Selection */}
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            required
          >
            <option value="">Select Category</option>
            {Object.entries(categories).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Paste your CSV data with the following columns:
          <br />
          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            Name, Description, Unit, Min Order, Price, Show Price, Show Description, Show Unit, Show Min Order, Quantity Step
          </code>
        </p>
        <div className="flex items-center justify-end mb-2">
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

        <div className="relative">
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            className="w-full h-64 p-2 border rounded-md font-mono text-sm"
            placeholder="Paste CSV data here..."
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={importing || !csvData.trim() || !selectedCategory}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importing...' : 'Import Products'}
        </button>
      </div>
    </div>
  );
}