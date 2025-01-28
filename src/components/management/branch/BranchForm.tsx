import React from 'react';
import type { Branch } from '../../../types/types';

interface BranchFormProps {
  branch?: Branch | null;
  onSubmit: (data: Omit<Branch, 'id'>) => void;
  onCancel: () => void;
}

export default function BranchForm({ branch, onSubmit, onCancel }: BranchFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    onSubmit({
      name: formData.get('name') as string
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Branch Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={branch?.name}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
          placeholder="e.g. Cokelateh Trail"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          {branch ? 'Update' : 'Add'} Branch
        </button>
      </div>
    </form>
  );
}