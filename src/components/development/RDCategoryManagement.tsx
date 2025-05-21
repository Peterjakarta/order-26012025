import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDCategory } from '../../types/rd-types';
import RDCategoryForm from './RDCategoryForm';
import ConfirmDialog from '../common/ConfirmDialog';
import Beaker from '../common/BeakerIcon';
import { 
  loadRDCategories, 
  addRDCategory, 
  updateRDCategory, 
  deleteRDCategory,
  dispatchRDDataChangedEvent,
  addRDDataChangeListener,
  setupRDDataListeners
} from '../../services/rdDataService';

export default function RDCategoryManagement() {
  const { categories } = useStore();
  const [rdCategories, setRdCategories] = useState<RDCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RDCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RDCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load categories data with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial load
    loadRDCategories()
      .then(categories => {
        setRdCategories(categories);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading R&D categories:', error);
        setError('Failed to load categories data. Please try again.');
        setLoading(false);
      });

    // Set up real-time listener
    const unsubscribe = setupRDDataListeners(
      // Categories update callback
      (categories) => {
        setRdCategories(categories);
        setLoading(false);
      },
      // Products update callback (unused here)
      () => {}
    );
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const categories = await loadRDCategories();
      setRdCategories(categories);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Filter categories based on search term and status
  const filteredCategories = rdCategories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (category.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || category.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (categoryData: Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      
      if (editingCategory) {
        // Update existing category
        const updatedCategory = await updateRDCategory(editingCategory.id, categoryData);
        if (updatedCategory) {
          setRdCategories(prev => prev.map(c => 
            c.id === editingCategory.id ? updatedCategory : c
          ));
        }
        setEditingCategory(null);
      } else {
        // Create new category
        const newCategory = await addRDCategory(categoryData);
        setRdCategories(prev => [...prev, newCategory]);
        setIsAddingCategory(false);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category. Please try again.');
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    
    try {
      setError(null);
      await deleteRDCategory(deletingCategory.id);
      setRdCategories(prev => prev.filter(c => c.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category. Please try again.');
    }
  };

  const toggleCategoryStatus = async (category: RDCategory) => {
    try {
      setError(null);
      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      const updatedCategory = await updateRDCategory(category.id, { status: newStatus });
      
      if (updatedCategory) {
        setRdCategories(prev => prev.map(c => 
          c.id === category.id ? updatedCategory : c
        ));
      }
    } catch (err) {
      console.error('Error updating category status:', err);
      setError('Failed to update category status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tag className="w-6 h-6 text-cyan-600" />
          Test Categories
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh data"
            className="w-10 h-10 flex items-center justify-center gap-2 rounded-full border hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-cyan-600' : 'text-gray-600'}`} />
          </button>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" />
            Add Test Category
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <h3 className="font-medium">Filter Categories</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {isAddingCategory && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">New Test Category</h3>
          <RDCategoryForm
            onSubmit={handleSubmit}
            onCancel={() => setIsAddingCategory(false)}
          />
        </div>
      )}

      {editingCategory && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Edit Test Category</h3>
          <RDCategoryForm
            category={editingCategory}
            onSubmit={handleSubmit}
            onCancel={() => setEditingCategory(null)}
          />
        </div>
      )}

      {filteredCategories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map(category => (
            <div 
              key={category.id}
              className={`bg-white rounded-lg shadow-sm border p-5 ${
                category.status === 'active' ? 'border-cyan-200' : 'border-gray-200 opacity-70'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">{category.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 mb-4">
                    {category.description || 'No description'}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    Created: {new Date(category.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => toggleCategoryStatus(category)}
                  className={`text-sm px-3 py-1.5 rounded-md ${
                    category.status === 'active'
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-green-700 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {category.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => setEditingCategory(category)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  title="Edit category"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingCategory(category)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No test categories found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? "No categories match your search criteria. Try adjusting your filters."
              : "Get started by adding your first test category."}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 text-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingCategory}
        title="Delete Test Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}