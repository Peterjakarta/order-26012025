import React, { useState } from 'react';
import { Tag, Plus, Trash2, GripVertical, Upload, ChevronDown, Edit2 } from 'lucide-react';
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
        <h2 className="text-xl font-semibold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          <Tag className="w-6 h-6" />
          Categories
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkImporting(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
          >
            <Upload className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-200 transform transition-all duration-300 hover:scale-[1.02]"
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
              className={`${draggedCategory === key ? 'opacity-50 bg-gray-50' : ''} group`}
            >
              <div className="p-4 flex justify-between items-center cursor-move hover:bg-gradient-to-r hover:from-gray-50 hover:to-pink-50 transition-colors duration-300">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-300" />
                  <div>
                    <h3 className="font-medium text-gray-900">{data.name}</h3>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : key)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
                  >
                    <ChevronDown className={`w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    {isExpanded ? 'Hide Products' : 'Show Products'}
                  </button>
                  <button
                    onClick={() => setEditingCategory(key)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deleteCategory(key)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 border border-gray-100 shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md group"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t bg-gradient-to-br from-gray-50 to-pink-50/30">
                  <CategoryProducts category={key} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}