import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, Upload, Folder, FolderPlus, X, FilePlus2, Search, List, Grid, Edit2, Trash2, File, FileSpreadsheet } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, createLogEntry } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import DocumentCategoryForm from './DocumentCategoryForm';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentViewer from './DocumentViewer';
import Beaker from '../../common/BeakerIcon';
import { v4 as uuidv4 } from 'uuid';
import { 
  getDocumentCategories, 
  createDocumentCategory, 
  updateDocumentCategory, 
  deleteDocumentCategory, 
  getDocuments, 
  deleteDocument, 
  initializeStorage,
  getDocumentUrl
} from '../../../lib/supabase-client';

// Type definitions for documentation
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFile {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'excel' | 'other';
  categoryId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export default function DocumentationManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize] = useState(12);
  const [isSupabaseInitialized, setIsSupabaseInitialized] = useState(false);

  // Initialize Supabase storage and load data
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        await initializeStorage();
        setIsSupabaseInitialized(true);
      } catch (err) {
        console.error('Error initializing Supabase storage:', err);
        setError('Failed to initialize document storage. Please try again later.');
      }
    };

    initializeSupabase();
  }, []);

  // Load categories and documents
  useEffect(() => {
    const loadData = async () => {
      if (!isSupabaseInitialized) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load categories from Supabase
        try {
          const categoriesData = await getDocumentCategories();
          
          // Convert to our internal format
          const formattedCategories: DocumentCategory[] = categoriesData.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || undefined,
            createdBy: cat.created_by || 'system',
            createdAt: cat.created_at,
            updatedAt: cat.updated_at
          }));
          
          setCategories(formattedCategories);
        } catch (err) {
          console.error('Error loading document categories from Supabase:', err);
          if (err instanceof Error) {
            setError(`Failed to load categories: ${err.message}`);
          } else {
            setError('Failed to load document categories');
          }
          return;
        }
        
        // Load documents with pagination
        await loadDocuments(1);
      } catch (err) {
        console.error('Error loading documentation data:', err);
        setError('Failed to load documentation data. Please check your network connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (isSupabaseInitialized) {
      loadData();
    }
  }, [isSupabaseInitialized]);

  // Load documents with pagination
  const loadDocuments = async (pageNum: number) => {
    try {
      const { data: docsData, count } = await getDocuments(
        pageNum,
        pageSize,
        selectedCategory !== 'all' ? selectedCategory : undefined,
        searchTerm || undefined
      );
      
      // Convert to our internal format
      const formattedDocs: DocumentFile[] = docsData.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description || undefined,
        fileName: doc.file_name,
        fileUrl: doc.file_path, // We'll get the actual URL when viewing
        fileType: doc.file_type as 'pdf' | 'excel' | 'other',
        categoryId: doc.category_id || '',
        createdBy: doc.created_by || 'unknown',
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        tags: doc.tags || undefined
      }));
      
      setDocuments(formattedDocs);
      setHasMore(formattedDocs.length === pageSize);
      setPage(pageNum);
    } catch (err) {
      console.error('Error loading documents:', err);
      if (err instanceof Error) {
        setError(`Failed to load documents: ${err.message}`);
      } else {
        setError('Failed to load documents');
      }
      throw err;
    }
  };

  // Load more documents
  const loadMore = async () => {
    if (!hasMore) return;
    
    try {
      const nextPage = page + 1;
      await loadDocuments(nextPage);
    } catch (err) {
      console.error('Error loading more documents:', err);
      setError('Failed to load more documents');
    }
  };

  // Add a new category
  const handleAddCategory = async (data: Omit<DocumentCategory, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Create category in Supabase
      const newCategory = await createDocumentCategory(
        data.name,
        data.description
      );
      
      // Convert to our internal format
      const formattedCategory: DocumentCategory = {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description || undefined,
        createdBy: newCategory.created_by || user?.email || 'unknown',
        createdAt: newCategory.created_at,
        updatedAt: newCategory.updated_at
      };
      
      // Update local state
      setCategories(prev => [...prev, formattedCategory]);
      setShowAddCategory(false);
    } catch (err) {
      console.error('Error adding category:', err);
      if (err instanceof Error) {
        setError(`Failed to add category: ${err.message}`);
      } else {
        setError('Failed to add category');
      }
      throw err;
    }
  };

  // Update a category
  const handleUpdateCategory = async (categoryId: string, data: Partial<DocumentCategory>) => {
    try {
      const updatedCategory = await updateDocumentCategory(
        categoryId,
        data.name || '',
        data.description
      );
      
      // Convert to our internal format
      const formattedCategory: DocumentCategory = {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description || undefined,
        createdBy: updatedCategory.created_by || user?.email || 'unknown',
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at
      };
      
      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId ? formattedCategory : cat
        )
      );
      
      setEditingCategory(null);
    } catch (err) {
      console.error('Error updating category:', err);
      if (err instanceof Error) {
        setError(`Failed to update category: ${err.message}`);
      } else {
        setError('Failed to update category');
      }
      throw err;
    }
  };

  // Delete a category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this category? All documents in this category will be moved to the General category.')) {
        return;
      }
      
      await deleteDocumentCategory(categoryId);
      
      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      // Update documents to use General category
      const generalCategory = categories.find(c => c.name === 'General');
      if (generalCategory) {
        setDocuments(prev => 
          prev.map(doc => 
            doc.categoryId === categoryId ? { ...doc, categoryId: generalCategory.id } : doc
          )
        );
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      if (err instanceof Error) {
        setError(`Failed to delete category: ${err.message}`);
      } else {
        setError('Failed to delete category');
      }
    }
  };

  // Add a new document
  const handleAddDocument = async (data: {
    title: string;
    description?: string;
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'excel' | 'other';
    categoryId: string;
    tags?: string[];
  }) => {
    try {
      // Create new document with provided data
      const newDocument: DocumentFile = {
        id: uuidv4(),
        ...data,
        createdBy: user?.email || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update the documents list
      setDocuments(prev => [newDocument, ...prev]);
      setShowUploadForm(false);
      
      // Create log entry
      await createLogEntry({
        userId: user?.id || 'unknown',
        username: user?.email || 'unknown',
        action: 'Uploaded Documentation',
        category: 'feature',
        details: `Uploaded document: ${data.title} (${data.fileType})`
      });
    } catch (err) {
      console.error('Error adding document:', err);
      if (err instanceof Error) {
        // Check for specific Supabase errors
        if (err.message.includes('row-level security policy')) {
          setError('Permission denied: You do not have sufficient permissions to upload documents.');
        } else if (err.message.includes('authenticated')) {
          setError('Authentication required: You must be signed in to upload documents.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred while uploading');
      }
      throw err;
    }
  };

  // Delete a document
  const handleDeleteDocument = async (documentId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this document?')) {
        return;
      }
      
      // Find the document to get the file path
      const document = documents.find(d => d.id === documentId);
      if (!document) {
        setError('Document not found');
        return;
      }
      
      await deleteDocument(documentId, document.fileUrl);
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      if (err instanceof Error) {
        setError(`Failed to delete document: ${err.message}`);
      } else {
        setError('Failed to delete document');
      }
    }
  };

  // Filter documents based on category and search term
  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'all' || doc.categoryId === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-10 h-10 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-10 h-10 text-green-600" />;
      default:
        return <FileText className="w-10 h-10 text-gray-600" />;
    }
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold">Documentation</h2>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            <FolderPlus className="w-4 h-4" />
            Add Category
          </button>
          
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Add Category Form */}
      {showAddCategory && (
        <DocumentCategoryForm 
          onSubmit={handleAddCategory} 
          onCancel={() => setShowAddCategory(false)}
        />
      )}

      {/* Edit Category Form */}
      {editingCategory && (
        <DocumentCategoryForm 
          category={editingCategory}
          onSubmit={(data) => handleUpdateCategory(editingCategory.id, data)} 
          onCancel={() => setEditingCategory(null)}
        />
      )}

      {/* Upload Document Form */}
      {showUploadForm && (
        <DocumentUploadForm
          categories={categories}
          onSubmit={handleAddDocument}
          onCancel={() => setShowUploadForm(false)}
        />
      )}

      {/* Filter and search */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-grow max-w-md relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category list */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            selectedCategory === 'all' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Categories
        </button>
        
        {categories.map(category => (
          <div key={category.id} className="flex items-center gap-1">
            <button
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                selectedCategory === category.id 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
            
            <div className="flex">
              <button
                onClick={() => setEditingCategory(category)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Edit category"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              {category.name !== 'General' && (
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        // Empty state
        <div className="bg-gray-50 p-12 rounded-lg text-center">
          <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No documentation found</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {searchTerm || selectedCategory !== 'all' 
              ? "No documents match your search criteria. Try adjusting your filters."
              : "Get started by uploading your first document."
            }
          </p>
        </div>
      ) : (
        // Documents display
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id} 
                className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors h-full flex flex-col"
                  onClick={() => setViewingDocument(doc)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {getFileIcon(doc.fileType)}
                      <div>
                        <h3 className="font-medium text-gray-900 line-clamp-1">{doc.title}</h3>
                        <p className="text-xs text-purple-600">{getCategoryName(doc.categoryId)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {doc.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{doc.description}</p>
                  )}
                  
                  <div className="mt-auto pt-3 border-t text-xs text-gray-500 flex justify-between items-center">
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewingDocument(doc)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3">
                          {getFileIcon(doc.fileType)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          {doc.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                        {getCategoryName(doc.categoryId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id);
                        }}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Load more button for pagination */}
      {!loading && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Load More
          </button>
        </div>
      )}

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer 
          documentFile={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}