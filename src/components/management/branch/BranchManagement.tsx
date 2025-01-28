import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react';
import { useBranches } from '../../../hooks/useBranches';
import BranchForm from './BranchForm';
import ConfirmDialog from '../../common/ConfirmDialog';
import type { Branch } from '../../../types/types';
import { getBranchStyles } from '../../../utils/branchStyles';

export default function BranchManagement() {
  const { branches, addBranch, updateBranch, deleteBranch } = useBranches();
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  const handleSubmit = async (data: Omit<Branch, 'id'>) => {
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, data);
        setEditingBranch(null);
      } else {
        await addBranch(data);
        setIsAddingBranch(false);
      }
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Failed to save branch. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    
    try {
      await deleteBranch(deletingBranch.id);
      setDeletingBranch(null);
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Failed to delete branch. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Branches
        </h2>
        <button
          onClick={() => setIsAddingBranch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {(isAddingBranch || editingBranch) && (
        <BranchForm
          branch={editingBranch}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsAddingBranch(false);
            setEditingBranch(null);
          }}
        />
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {branches.map(branch => {
          const styles = getBranchStyles(branch.id);
          
          return (
            <div key={branch.id} className="p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{branch.name}</h3>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-md text-sm ${styles.base}`}>
                    {branch.id}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBranch(branch)}
                  className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeletingBranch(branch)}
                  className="flex items-center gap-2 px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deletingBranch}
        title="Delete Branch"
        message={`Are you sure you want to delete ${deletingBranch?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingBranch(null)}
      />
    </div>
  );
}