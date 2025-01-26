import React, { useState } from 'react';
import { Upload, AlertCircle, Copy, Check } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import type { Product } from '../../../types/types';

interface BulkProductImportProps {
  category?: string;
  onComplete: () => void;
}

const EXAMPLE_DATA = `Dark Chocolate Truffles
Milk Chocolate Bars
Classic Pralines
Champagne Truffles
Single Origin Dark Bars`;

export default function BulkProductImport({ category, onComplete }: BulkProductImportProps) {
  const { addProduct } = useStore();
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_DATA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = async () => {
    if (!category) {
      setError('Category is required');
      return;
    }

    if (!pastedData.trim()) {
      setError('Please enter at least one product name');
      return;
    }

    try {
      setImporting(true);
      setError('');

      const lines = pastedData.split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      
      // Process each line sequentially to maintain order
      for (const name of lines) {
        const productData: Omit<Product, 'id'> = {
          name,
          category,
          description: '',
          unit: 'pcs', // Default unit
          minOrder: 1,
          price: 0,
          showPrice: false,
          showDescription: false,
          showUnit: true,
          showMinOrder: false,
          quantityStep: category.toLowerCase().includes('bonbon') ? 28 : undefined // Set default step for bonbons
        };

        await addProduct(productData);
      }

      setPastedData('');
      onComplete();
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import products. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Import Products
        </label>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">
            Enter one product name per line
          </p>
          <button
            onClick={handleCopyExample}
            className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
            title="Copy example format"
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
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            placeholder="Enter product names here..."
            className="w-full h-32 p-2 border rounded-md font-mono text-sm"
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
          disabled={importing || !pastedData.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importing...' : 'Import Products'}
        </button>
      </div>
    </div>
  );
}