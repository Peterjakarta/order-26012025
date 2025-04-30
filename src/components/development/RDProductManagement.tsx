import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, ArrowUpRight, Search, Filter, Calendar, Star, FileDown, Tag } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { RDProduct, RDCategory } from '../../types/rd-types';
import RDProductForm from './RDProductForm';
import RDProductDetails from './RDProductDetails';
import RDCategoryForm from './RDCategoryForm';
import ConfirmDialog from '../common/ConfirmDialog';
import Beaker from '../common/BeakerIcon';

// Demo data for initial implementation
const DEMO_RD_PRODUCTS: RDProduct[] = [
  {
    id: 'rd-product-1',
    name: 'Ruby Chocolate Pralines',
    category: 'pralines',
    description: 'Premium pralines made with ruby chocolate and raspberry filling',
    unit: 'boxes',
    minOrder: 5,
    price: 32.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-10',
    targetProductionDate: '2025-07-15',
    status: 'development',
    notes: 'Working on stabilizing the raspberry filling. Need to test shelf life at room temperature.',
    imageUrls: [
      'https://images.unsplash.com/photo-1548907040-4baa42d10919?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHJ1Ynklc2hvY29sYXRlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cmFzcGJlcnJ5fGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 15.75,
    createdBy: 'admin',
    createdAt: '2025-01-10T09:30:00Z',
    updatedAt: '2025-01-15T14:20:00Z'
  },
  {
    id: 'rd-product-2',
    name: 'Matcha Infused Truffles',
    category: 'truffles',
    description: 'White chocolate truffles with premium matcha powder',
    unit: 'boxes',
    minOrder: 4,
    price: 28.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-02-05',
    targetProductionDate: '2025-06-01',
    status: 'testing',
    notes: 'Trying different matcha suppliers for best color and flavor profile. Current batch has great color but slightly bitter aftertaste.',
    imageUrls: [
      'https://images.unsplash.com/photo-1581200005213-6fe9842cefd4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bWF0Y2hhJTIwY2hvY29sYXRlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 12.50,
    createdBy: 'admin',
    createdAt: '2025-02-05T11:15:00Z',
    updatedAt: '2025-02-20T16:45:00Z'
  },
  {
    id: 'rd-product-3',
    name: 'Salted Caramel Bonbons',
    category: 'bonbon',
    description: 'Milk chocolate bonbons with salted caramel filling',
    unit: 'boxes',
    minOrder: 6,
    price: 34.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2024-12-15',
    status: 'approved',
    notes: 'Recipe finalized and approved for production. First batch scheduled for June production.',
    imageUrls: [
      'https://images.unsplash.com/photo-1582176604856-e824b4736522?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2FyYW1lbCUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 16.25,
    createdBy: 'admin',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2025-03-01T09:30:00Z'
  }
];

// Demo RD categories
const DEMO_RD_CATEGORIES: RDCategory[] = [
  {
    id: 'rd-category-1',
    name: 'Experimental Truffles',
    description: 'New and innovative truffle flavors and designs',
    status: 'active',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'rd-category-2',
    name: 'Sugar-Free Products',
    description: 'Chocolate products with no added sugars',
    status: 'active',
    createdAt: '2025-02-10T14:45:00Z',
    updatedAt: '2025-02-12T09:15:00Z',
  },
  {
    id: 'rd-category-3',
    name: 'Vegan Range',
    description: 'Plant-based chocolate products with no animal ingredients',
    status: 'active',
    createdAt: '2025-02-20T11:00:00Z',
    updatedAt: '2025-02-20T11:00:00Z',
  },
  {
    id: 'rd-category-4',
    name: 'Single Origin Series',
    description: 'Chocolates made from beans of specific regions',
    status: 'inactive',
    createdAt: '2024-12-05T16:30:00Z',
    updatedAt: '2025-01-10T13:20:00Z',
  }
];

export default function RDProductManagement() {
  const { categories } = useStore();
  const { user } = useAuth();
  const [rdProducts, setRdProducts] = useState<RDProduct[]>(DEMO_RD_PRODUCTS);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RDProduct | null>(null);
  const [viewingProduct, setViewingProduct] = useState<RDProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<RDProduct | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RDProduct['status'] | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Category management state
  const [rdCategories, setRdCategories] = useState<RDCategory[]>(DEMO_RD_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RDCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RDCategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  // Filter products based on search term, status, and category
  const filteredProducts = rdProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSubmitProduct = async (productData: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      const now = new Date().toISOString();
      
      if (editingProduct) {
        // Update existing product
        const updatedProduct = {
          ...editingProduct,
          ...productData,
          updatedAt: now
        };
        
        setRdProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? updatedProduct : p
        ));
        
        setEditingProduct(null);
      } else {
        // Create new product
        const newProduct: RDProduct = {
          ...productData,
          id: `rd-product-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
          createdBy: user?.email || 'unknown'
        };
        
        setRdProducts(prev => [...prev, newProduct]);
        setIsAddingProduct(false);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = () => {
    if (!deletingProduct) return;
    
    setRdProducts(prev => prev.filter(p => p.id !== deletingProduct.id));
    setDeletingProduct(null);
  };

  const handleSubmitCategory = async (categoryData: Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = new Date().toISOString();
      
      if (editingCategory) {
        // Update existing category
        const updatedCategory = {
          ...editingCategory,
          ...categoryData,
          updatedAt: now
        };
        
        setRdCategories(prev => prev.map(c => 
          c.id === editingCategory.id ? updatedCategory : c
        ));
        
        setEditingCategory(null);
      } else {
        // Create new category
        const newCategory: RDCategory = {
          ...categoryData,
          id: `rd-category-${Date.now()}`,
          createdAt: now,
          updatedAt: now
        };
        
        setRdCategories(prev => [...prev, newCategory]);
        setIsAddingCategory(false);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category. Please try again.');
    }
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    
    setRdCategories(prev => prev.filter(c => c.id !== deletingCategory.id));
    setDeletingCategory(null);
  };

  const handleApproveForProduction = (product: RDProduct) => {
    // Here we would normally send this to the production system
    // For now, just change status to approved
    const updatedProduct = {
      ...product,
      status: 'approved' as const,
      updatedAt: new Date().toISOString()
    };
    
    setRdProducts(prev => prev.map(p => 
      p.id === product.id ? updatedProduct : p
    ));
    
    setViewingProduct(updatedProduct);
  };

  const toggleCategoryStatus = (category: RDCategory) => {
    const newStatus = category.status === 'active' ? 'inactive' : 'active';
    const updatedCategory = {
      ...category,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    
    setRdCategories(prev => prev.map(c => 
      c.id === category.id ? updatedCategory : c
    ));
  };

  const renderStatusBadge = (status: RDProduct['status']) => {
    const statusConfig = {
      planning: { bg: 'bg-blue-100', text: 'text-blue-800' },
      development: { bg: 'bg-amber-100', text: 'text-amber-800' },
      testing: { bg: 'bg-purple-100', text: 'text-purple-800' },
      approved: { bg: 'bg-green-100', text: 'text-green-800' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800' }
    };
    
    const config = statusConfig[status];
    
    return (
      <span className={`absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
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
                onSubmit={handleSubmitCategory}
                onCancel={() => setIsAddingCategory(false)}
              />
            </div>
          )}

          {editingCategory && (
            <div className="mb-4">
              <RDCategoryForm
                category={editingCategory}
                onSubmit={handleSubmitCategory}
                onCancel={() => setEditingCategory(null)}
              />
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rdCategories.map(category => (
              <div 
                key={category.id}
                className={`bg-white rounded-lg shadow-sm border p-4 ${
                  category.status === 'active' ? 'border-cyan-200' : 'border-gray-200 opacity-70'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        category.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 mb-2">
                      {category.description || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2 mt-3 pt-2 border-t">
                  <button
                    onClick={() => toggleCategoryStatus(category)}
                    className={`text-sm px-2 py-1 rounded ${
                      category.status === 'active'
                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'text-green-700 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {category.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    title="Edit category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCategory(category)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
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
              {Object.entries(categories).map(([id, { name }]) => (
                <option key={id} value={id}>{name}</option>
              ))}
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

      {filteredProducts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map(product => (
            <div 
              key={product.id}
              className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow 
                ${product.status === 'approved' ? 'border-green-200' : 
                product.status === 'rejected' ? 'border-red-200' : 'border-gray-200'}`}
            >
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {product.imageUrls && product.imageUrls[0] ? (
                  <img 
                    src={product.imageUrls[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Beaker className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {renderStatusBadge(product.status)}
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-medium text-lg">{product.name}</h3>
                  <span className="text-sm text-gray-500">
                    {categories[product.category]?.name || product.category}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Started: {new Date(product.developmentDate).toLocaleDateString()}</span>
                  </div>
                  {product.targetProductionDate && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Star className="w-3.5 h-3.5" />
                      <span>Target: {new Date(product.targetProductionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center pt-2 mt-2 border-t">
                  <button
                    onClick={() => setViewingProduct(product)}
                    className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Details</span>
                  </button>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      title="Edit product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(product)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      title="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {product.status === 'approved' && (
                      <button
                        onClick={() => alert('Move to production functionality coming soon')}
                        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                        title="Move to production"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}