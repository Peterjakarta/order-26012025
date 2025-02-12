import React, { useState } from 'react';
import { Tag, Plus, Trash2, GripVertical, Upload } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useStore } from '../../store/StoreContext';
import CategoryForm from './CategoryForm';
import AddCategoryForm from './AddCategoryForm';
import CategoryProducts from './category/CategoryProducts';
import BulkCategoryImport from './category/BulkCategoryImport';
import type { ProductCategory } from '../../types/types';

export default function CategoryManagement() {
  const { categories, updateCategory, deleteCategory } = useCategories();
  const { categoryOrder, reorderCategories } = useStore();
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleDragStart = (category: string, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCategory(category);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  };

  const handleDrop = async (targetCategory: string, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory === targetCategory) {
      return;
    }

    const currentOrder = [...categoryOrder];
    const draggedIndex = currentOrder.indexOf(draggedCategory);
    const targetIndex = currentOrder.indexOf(targetCategory);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedCategory);

    // Update store with new order
    try {
      await reorderCategories(currentOrder);
    } catch (error) {
      console.error('Error reordering categories:', error);
    }

    setDraggedCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tag className="w-6 h-6" />
          Categories
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkImporting(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {isBulkImporting && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <BulkCategoryImport onComplete={() => setIsBulkImporting(false)} />
        </div>
      )}

      {isAddingCategory && (
        <AddCategoryForm onCancel={() => setIsAddingCategory(false)} />
      )}

      {editingCategory && (
        <CategoryForm
          category={editingCategory}
          categoryData={categories[editingCategory]}
          onSubmit={async (data) => {
            await updateCategory(editingCategory, data);
            setEditingCategory(null);
          }}
          onCancel={() => setEditingCategory(null)}
        />
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {categoryOrder.map((key) => {
          const data = categories[key];
          if (!data) return null;
          
          const isExpanded = expandedCategory === key;
          
          return (
            <div
              key={key}
              draggable
              onDragStart={(e) => handleDragStart(key, e)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(key, e)}
              className={`${draggedCategory === key ? 'opacity-50 bg-gray-50' : ''}`}
            >
              <div className="p-4 flex justify-between items-center cursor-move">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="font-medium">{data.name}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : key)}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    {isExpanded ? 'Hide Products' : 'Show Products'}
                  </button>
                  <button
                    onClick={() => setEditingCategory(key)}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCategory(key)}
                    className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <CategoryProducts category={key} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}