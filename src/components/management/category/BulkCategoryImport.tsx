import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '../../../store/StoreContext';
import { sanitizeCategoryId } from '../../../utils/categoryUtils';

interface BulkCategoryImportProps {
  onComplete: () => void;
}

export default function BulkCategoryImport({ onComplete }: BulkCategoryImportProps) {
  const { addCategory } = useStore();
  const [categories, setCategories] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const lines = categories.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const name = line.trim();
        if (!name) continue;

        const id = sanitizeCategoryId(name);
        await addCategory(id, { name });
      }

      setCategories('');
      onComplete();
    } catch (err) {
      setError('Failed to import categories. Please check the format and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bulk Import Categories
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Enter one category name per line
        </p>
        <textarea
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          className="w-full h-40 p-2 border rounded-md font-mono text-sm"
          placeholder="Premium Chocolates"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Upload className="w-4 h-4" />
          Import Categories
        </button>
      </div>
    </form>
  );
}