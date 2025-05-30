import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { DocumentCategory } from './DocumentationManagement';

interface DocumentCategoryFormProps {
  category?: DocumentCategory;
  onSubmit: (data: Omit<DocumentCategory, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function DocumentCategoryForm({ category, onSubmit, onCancel }: DocumentCategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!name.trim()) {
        setError('Category name is required');
        return;
      }
      
      setLoading(true);
      
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined
      });
    } catch (err) {
      console.error('Error submitting category:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="e.g. Product Specifications"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Describe this category..."
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              {category ? 'Update' : 'Create'} Category
            </>
          )}
        </button>
      </div>
    </form>
  );
}