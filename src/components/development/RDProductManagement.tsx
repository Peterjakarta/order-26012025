import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, ArrowUpRight, Calendar, Star, FileText, Check, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ClipboardList, FileDown, Tag, Search, Filter } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { RDProduct, RDCategory } from '../../types/rd-types';
import RDProductForm from './RDProductForm';
import RDProductDetails from './RDProductDetails';
import RDCategoryForm from './RDCategoryForm';
import ConfirmDialog from '../common/ConfirmDialog';
import Beaker from '../common/BeakerIcon';
import MoveToProductionDialog from './MoveToProductionDialog';
import { 
  loadRDProducts, 
  loadRDCategories, 
  addRDProduct, 
  updateRDProduct, 
  deleteRDProduct,
  addRDCategory,
  updateRDCategory,
  deleteRDCategory,
  scheduleRDProductForProduction,
  dispatchRDDataChangedEvent,
  addRDDataChangeListener
} from '../../services/rdDataService';

export default function RDProductManagement() {
  const { categories, ingredients, products, recipes } = useStore();
  const { user } = useAuth();
  const [rdProducts, setRdProducts] = useState<RDProduct[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RDProduct | null>(null);
  const [viewingProduct, setViewingProduct] = useState<RDProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<RDProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RDProduct['status'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [movingToProduction, setMovingToProduction] = useState<RDProduct | null>(null);
  
  // Category management state
  const [rdCategories, setRdCategories] = useState<RDCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RDCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RDCategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  
  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Track already migrated products
  const [migratedProductIds, setMigratedProductIds] = useState<Set<string>>(new Set());
  
  // Load data on component mount
  useEffect(() => {
    loadData();
    
    // Listen for changes from other components
    const unsubscribe = addRDDataChangeListener(loadData);
    
    return unsubscribe;
  }, []);

  // Check which products have been migrated to production
  useEffect(() => {
    const migrated = new Set<string>();
    
    rdProducts.forEach(product => {
      // Check if there's a product with a similar name in production
      const similarProduct = products.find(p => 
        p.name.toLowerCase() === product.name.toLowerCase()
      );
      
      // Or check for recipe created for this product
      const relatedRecipe = recipes.some(r => r.notes?.includes(`Development ID: ${product.id}`));
      
      if (similarProduct || relatedRecipe) {
        migrated.add(product.id);
      }
    });
    
    setMigratedProductIds(migrated);
  }, [rdProducts, products, recipes]);

  const loadData = () => {
    try {
      // Load products
      const products = loadRDProducts();
      setRdProducts(products);
      
      // Load categories
      const categories = loadRDCategories();
      setRdCategories(categories);
    } catch (error) {
      console.error('Error loading R&D data:', error);
    }
  };

  // Combined categories for filtering (includes both production and RD categories)
  const combinedCategoryOptions = {
    ...categories,
    ...rdCategories.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: { name: cat.name }
    }), {})
  };

  // Filter products based on search term, status, and category
  const filteredProducts = rdProducts.filter(product => {
    // Filter by search term
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by selected status
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    // Filter by selected category
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });
  
  // Group products by category for display
  const productsByCategory = React.useMemo(() => {
    const grouped: Record<string, RDProduct[]> = {};
    
    // Start with all categories to ensure empty categories are displayed
    Object.keys(combinedCategoryOptions).forEach(categoryId => {
      grouped[categoryId] = [];
    });
    
    // Add products to their respective categories
    filteredProducts.forEach(product => {
      if (!grouped[product.category]) {
        grouped[product.category] = [];
      }
      grouped[product.category].push(product);
    });
    
    // Filter out empty categories if we're not showing all
    if (categoryFilter !== 'all') {
      return Object.entries(grouped)
        .filter(([id, _]) => id === categoryFilter)
        .reduce((acc, [id, products]) => {
          acc[id] = products;
          return acc;
        }, {} as Record<string, RDProduct[]>);
    }
    
    return grouped;
  }, [filteredProducts, combinedCategoryOptions, categoryFilter]);
  
  // Auto-expand categories with few products
  useEffect(() => {
    const categoriesToExpand = new Set<string>();
    
    Object.entries(productsByCategory).forEach(([categoryId, products]) => {
      // Auto-expand categories with 3 or fewer products, or if there's only one category
      if (products.length > 0 && (products.length <= 3 || Object.keys(productsByCategory).length === 1)) {
        categoriesToExpand.add(categoryId);
      }
    });
    
    setExpandedCategories(categoriesToExpand);
  }, [productsByCategory]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleSubmitProduct = async (data: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      if (editingProduct) {
        // Update existing product
        const updatedProduct = updateRDProduct(editingProduct.id, data);
        if (updatedProduct) {
          setRdProducts(prev => prev.map(p => 
            p.id === editingProduct.id ? updatedProduct : p
          ));
        }
        setEditingProduct(null);
      } else {
        // Create new product
        const newProduct = addRDProduct(data);
        setRdProducts(prev => [...prev, newProduct]);
        setIsAddingProduct(false);
      }
      
      // Notify other components that data has changed
      dispatchRDDataChangedEvent();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = () => {
    if (!deletingProduct) return;
    
    deleteRDProduct(deletingProduct.id);
    setRdProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
    setDeletingProduct(null);
    
    // Notify other components that data has changed
    dispatchRDDataChangedEvent();
  };

  const handleApproveForProduction = (product: RDProduct) => {
    const targetDate = product.targetProductionDate || new Date().toISOString().split('T')[0];
    const updatedProduct = scheduleRDProductForProduction(product.id, targetDate);
    
    if (updatedProduct) {
      const statusUpdated = updateRDProduct(product.id, { status: 'approved' as const });
      if (statusUpdated) {
        setRdProducts(prev => prev.map(p => 
          p.id === product.id ? statusUpdated : p
        ));
        setViewingProduct(statusUpdated);
      }
    }
    
    // Show confirmation to user
    alert(`${product.name} is scheduled for production on ${new Date(targetDate).toLocaleDateString()}`);
    
    // Notify other components that data has changed
    dispatchRDDataChangedEvent();
  };

  const handleMoveToProduction = (product: RDProduct) => {
    setMovingToProduction(product);
  };

  const handleProductionSuccess = () => {
    // Reload data after successful migration
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Beaker className="w-6 h-6 text-cyan-600" />
          R&D Products
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategories(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showCategories ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'hover:bg-gray-50'
            }`}
          >
            <Tag className="w-4 h-4" />
            {showCategories ? 'Hide Categories' : 'Manage Categories'}
          </button>
          <button
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" />
            Add R&D Product
          </button>
        </div>
      </div>

      {/* Category Management Section */}
      {showCategories && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-medium flex items-center gap-2">
              <Tag className="w-5 h-5 text-cyan-600" />
              Test Categories
            </h3>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {isAddingCategory && (
            <div className="mb-4">
              <RDCategoryForm
                onSubmit={(categoryData) => {
                  const newCategory = addRDCategory(categoryData);
                  setRdCategories(prev => [...prev, newCategory]);
                  setIsAddingCategory(false);
                  dispatchRDDataChangedEvent();
                }}
                onCancel={() => setIsAddingCategory(false)}
              />
            </div>
          )}

          {editingCategory && (
            <div className="mb-4">
              <RDCategoryForm
                category={editingCategory}
                onSubmit={(categoryData) => {
                  const updatedCategory = updateRDCategory(editingCategory.id, categoryData);
                  if (updatedCategory) {
                    setRdCategories(prev => prev.map(c => 
                      c.id === editingCategory.id ? updatedCategory : c
                    ));
                  }
                  setEditingCategory(null);
                  dispatchRDDataChangedEvent();
                }}
                onCancel={() => setEditingCategory(null)}
              />
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rdCategories.map(category => (
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
                    onClick={() => {
                      updateRDCategory(category.id, { 
                        status: category.status === 'active' ? 'inactive' : 'active' 
                      });
                      setRdCategories(prev => prev.map(c => 
                        c.id === category.id ? {...c, status: c.status === 'active' ? 'inactive' : 'active'} : c
                      ));
                      dispatchRDDataChangedEvent();
                    }}
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
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-5 h-5" />
          <h3 className="font-medium">Filter Products</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RDProduct['status'] | 'all')}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="development">In Development</option>
              <option value="testing">Testing</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="all">All Categories</option>
              {/* Standard Production Categories */}
              <optgroup label="Production Categories">
                {Object.entries(categories).map(([id, { name }]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </optgroup>
              
              {/* Test Categories */}
              {rdCategories.filter(cat => cat.status === 'active').length > 0 && (
                <optgroup label="Test Categories">
                  {rdCategories
                    .filter(cat => cat.status === 'active')
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {isAddingProduct && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">New R&D Product</h3>
          <RDProductForm
            onSubmit={handleSubmitProduct}
            onCancel={() => setIsAddingProduct(false)}
            initialCategory={categoryFilter !== 'all' ? categoryFilter : undefined}
            rdCategories={rdCategories.filter(cat => cat.status === 'active')}
          />
        </div>
      )}

      {editingProduct && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Edit R&D Product</h3>
          <RDProductForm
            product={editingProduct}
            onSubmit={handleSubmitProduct}
            onCancel={() => setEditingProduct(null)}
            rdCategories={rdCategories.filter(cat => cat.status === 'active')}
          />
        </div>
      )}

      {viewingProduct && (
        <RDProductDetails
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onEdit={() => {
            setEditingProduct(viewingProduct);
            setViewingProduct(null);
          }}
          onApprove={() => handleApproveForProduction(viewingProduct)}
        />
      )}

      {/* Products Listed by Category */}
      {Object.keys(productsByCategory).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(productsByCategory).map(([categoryId, products]) => {
            // Skip categories with no products
            if (products.length === 0) return null;
            
            const categoryName = combinedCategoryOptions[categoryId]?.name || categoryId;
            const isExpanded = expandedCategories.has(categoryId);
            
            return (
              <div key={categoryId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Category Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCategory(categoryId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <h3 className="font-medium">{categoryName}</h3>
                      <span className="text-sm text-gray-500">({products.length} products)</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Category stats/indicators could go here */}
                    </div>
                  </div>
                </div>
                
                {/* Category Content (Products) */}
                {isExpanded && (
                  <div className="border-t">
                    <div className="divide-y">
                      {products.map(product => (
                        <div key={product.id} className="p-4 hover:bg-gray-50">
                          <div className="md:flex justify-between items-start gap-4">
                            {/* Product Image (if available) */}
                            {product.imageUrls && product.imageUrls[0] && (
                              <div className="md:w-1/4 mb-4 md:mb-0">
                                <div className="h-32 rounded-lg overflow-hidden bg-gray-100">
                                  <img 
                                    src={product.imageUrls[0]} 
                                    alt={product.name} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Product Info */}
                            <div className={`${product.imageUrls && product.imageUrls[0] ? 'md:w-3/4' : 'w-full'}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium">{product.name}</h4>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                      ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                      product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                      'bg-cyan-100 text-cyan-800'}`}
                                    >
                                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                                    </span>
                                  </div>
                                  
                                  {product.description && (
                                    <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Dev: {new Date(product.developmentDate).toLocaleDateString()}</span>
                                    </div>
                                    {product.targetProductionDate && (
                                      <div className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5" />
                                        <span>Target: {new Date(product.targetProductionDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {product.price && (
                                      <div>${product.price.toFixed(2)} / {product.unit || 'unit'}</div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-shrink-0 gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingProduct(product);
                                    }}
                                    className="p-1.5 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded-full"
                                    title="View product details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingProduct(product);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                    title="Edit product"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeletingProduct(product);
                                    }}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                    title="Delete product"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Compact Test Results and Actions */}
                              <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-2 border-t">
                                <div className="flex flex-wrap gap-2">
                                  {product.targetProductionDate && (
                                    <span className="text-xs font-medium px-2 py-1 bg-cyan-50 text-cyan-700 rounded-md">
                                      Production: {new Date(product.targetProductionDate).toLocaleDateString()}
                                    </span>
                                  )}
                                  {product.status === 'testing' && (
                                    <span className="text-xs font-medium px-2 py-1 bg-purple-50 text-purple-700 rounded-md">
                                      Testing in progress
                                    </span>
                                  )}
                                  {product.status === 'approved' && (
                                    <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-md">
                                      Ready for production
                                    </span>
                                  )}
                                </div>
                                
                                {product.status === 'approved' && (
                                  migratedProductIds.has(product.id) ? (
                                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                                      <Check className="w-3.5 h-3.5" />
                                      ALREADY MIGRATED
                                    </span>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveToProduction(product);
                                      }}
                                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                      To Production
                                    </button>
                                  )
                                )}
                                {product.status !== 'approved' && product.status !== 'rejected' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveForProduction(product);
                                    }}
                                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-cyan-100 text-cyan-800 rounded-md hover:bg-cyan-200"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No R&D products found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? "No products match your search criteria. Try adjusting your filters."
              : "Get started by adding your first R&D product."}
          </p>
          {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="px-4 py-2 border rounded-md hover:bg-gray-50 text-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Delete confirmations */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        title="Delete R&D Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />
      
      <ConfirmDialog
        isOpen={!!deletingCategory}
        title="Delete Test Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (!deletingCategory) return;
          const success = deleteRDCategory(deletingCategory.id);
          if (success) {
            setRdCategories(prev => prev.filter(c => c.id !== deletingCategory.id));
            dispatchRDDataChangedEvent();
          }
          setDeletingCategory(null);
        }}
        onCancel={() => setDeletingCategory(null)}
      />

      {/* Move to production dialog */}
      {movingToProduction && (
        <MoveToProductionDialog 
          product={movingToProduction}
          onClose={() => setMovingToProduction(null)}
          onSuccess={handleProductionSuccess}
        />
      )}
    </div>
  );
}