import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, ArrowUpRight, Search, Filter, Calendar, Star, FileDown, Tag, ChevronDown, ChevronRight, Check } from 'lucide-react';
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
  },
  {
    id: 'rd-product-4',
    name: 'Vegan Dark Chocolate Truffles',
    category: 'rd-category-3', // Vegan Range
    description: 'Plant-based dark chocolate truffles with coconut cream',
    unit: 'boxes',
    minOrder: 5,
    price: 29.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-02-01',
    targetProductionDate: '2025-05-15',
    status: 'testing',
    notes: 'Testing shelf stability and mouthfeel. Current version is promising but needs texture adjustment.',
    imageUrls: [
      'https://images.unsplash.com/photo-1608221386777-6c3c1a506291?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGRhcmslMjBjaG9jb2xhdGUlMjB0cnVmZmxlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 14.25,
    createdBy: 'admin',
    createdAt: '2025-02-01T09:15:00Z',
    updatedAt: '2025-02-10T16:30:00Z'
  },
  {
    id: 'rd-product-5',
    name: 'Sugar-Free Milk Chocolate',
    category: 'rd-category-2', // Sugar-Free Products
    description: 'Milk chocolate sweetened with stevia and erythritol',
    unit: 'bars',
    minOrder: 10,
    price: 5.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-20',
    targetProductionDate: '2025-04-10',
    status: 'development',
    notes: 'Working on improving the aftertaste from stevia. Latest batch shows promise with new stevia extract.',
    imageUrls: [
      'https://images.unsplash.com/photo-1614088685112-0b05b6f1e570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWlsayUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 3.25,
    createdBy: 'admin',
    createdAt: '2025-01-20T11:30:00Z',
    updatedAt: '2025-01-28T13:45:00Z'
  },
  {
    id: 'rd-product-6',
    name: 'Experimental Whiskey Ganache',
    category: 'rd-category-1', // Experimental Truffles
    description: 'Dark chocolate ganache infused with single malt whiskey',
    unit: 'boxes',
    minOrder: 3,
    price: 45.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-15',
    targetProductionDate: '2025-03-30',
    status: 'testing',
    notes: 'Testing different whiskey varieties. Need to balance alcohol content for flavor vs shelf stability.',
    imageUrls: [
      'https://images.unsplash.com/photo-1620504600375-4793e85ecbd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hvY29sYXRlJTIwZ2FuYWNoZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 22.30,
    createdBy: 'admin',
    createdAt: '2025-01-15T15:20:00Z',
    updatedAt: '2025-02-05T10:10:00Z'
  },
  {
    id: 'rd-product-7',
    name: 'Ghana Single Origin 75%',
    category: 'rd-category-4', // Single Origin Series
    description: 'Dark chocolate from single estate Ghana cocoa beans',
    unit: 'bars',
    minOrder: 8,
    price: 7.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2024-12-10',
    targetProductionDate: '2025-04-01',
    status: 'development',
    notes: 'Experimenting with different roasting profiles to highlight fruity notes.',
    imageUrls: [
      'https://images.unsplash.com/photo-1589750602846-60c8c5ea3e56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8ZGFyayUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 4.50,
    createdBy: 'admin',
    createdAt: '2024-12-10T12:00:00Z',
    updatedAt: '2025-01-05T09:30:00Z'
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
    status: 'active',
    createdAt: '2024-12-05T16:30:00Z',
    updatedAt: '2025-01-10T13:20:00Z',
  }
];

export default function RDProductManagement() {
  const { categories, ingredients } = useStore();
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
  
  // Track expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
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
      
      // If this product has a targetProductionDate, we need to ensure it appears in the
      // production schedule. For demo purposes, this just logs the synchronization
      if (productData.targetProductionDate) {
        console.log(`Syncing product ${productData.name} to production schedule for ${productData.targetProductionDate}`);
        // In a real implementation, this would update the Production table
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                  className="p-4 cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                  onClick={() => toggleCategory(categoryId)}
                >
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
                                    {renderStatusBadge(product.status)}
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alert('Move to production functionality coming soon');
                                    }}
                                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    To Production
                                  </button>
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
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
}