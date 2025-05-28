import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, Upload, Folder, FolderPlus, X, FilePlus2, Search, List, Grid, Edit2, Trash2, File } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, createLogEntry } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import DocumentCategoryForm from './DocumentCategoryForm';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentViewer from './DocumentViewer';
import Beaker from '../../common/BeakerIcon';

// Add a new collection name for documentation
const DOCS_COLLECTION = 'rd_documents';
const DOCS_CATEGORIES_COLLECTION = 'rd_document_categories';

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

export default function DocumentationManager() {
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

  // Load categories and documents
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create collections if they don't exist
        await ensureCollectionsExist();
        
        // Load categories
        const categoriesQuery = query(
          collection(db, DOCS_CATEGORIES_COLLECTION),
          orderBy('name')
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData: DocumentCategory[] = [];
        
        categoriesSnapshot.forEach(doc => {
          const data = doc.data();
          categoriesData.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          });
        });
        
        setCategories(categoriesData);
        
        // Load documents
        const documentsQuery = query(
          collection(db, DOCS_COLLECTION),
          orderBy('createdAt', 'desc')
        );
        const documentsSnapshot = await getDocs(documentsQuery);
        const documentsData: DocumentFile[] = [];
        
        documentsSnapshot.forEach(doc => {
          const data = doc.data();
          documentsData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            fileName: data.fileName,
            fileUrl: data.fileUrl,
            fileType: data.fileType,
            categoryId: data.categoryId,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            tags: data.tags
          });
        });
        
        setDocuments(documentsData);
      } catch (err) {
        console.error('Error loading documentation data:', err);
        setError('Failed to load documentation data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Ensure collections exist
  const ensureCollectionsExist = async () => {
    try {
      // Check if categories collection exists
      const categoriesQuery = query(collection(db, DOCS_CATEGORIES_COLLECTION), limit(1));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      
      // If no categories, create a default one
      if (categoriesSnapshot.empty) {
        const defaultCategoryId = 'general';
        await setDoc(doc(db, DOCS_CATEGORIES_COLLECTION, defaultCategoryId), {
          id: defaultCategoryId,
          name: 'General',
          description: 'General documentation',
          createdBy: user?.email || 'system',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Check if documents collection exists
      const docsQuery = query(collection(db, DOCS_COLLECTION), limit(1));
      await getDocs(docsQuery);
      
      return true;
    } catch (err) {
      console.error('Error ensuring collections exist:', err);
      return false;
    }
  };

  // Add a new category
  const handleAddCategory = async (data: Omit<DocumentCategory, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    try {
      const categoryId = `doc-category-${Date.now()}`;
      const newCategory: DocumentCategory = {
        id: categoryId,
        ...data,
        createdBy: user?.email || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await setDoc(doc(db, DOCS_CATEGORIES_COLLECTION, categoryId), {
        ...newCategory,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCategories(prev => [...prev, newCategory]);
      setShowAddCategory(false);
      
      // Create log entry
      await createLogEntry({
        userId: user?.id || 'unknown',
        username: user?.email || 'unknown',
        action: 'Created Documentation Category',
        category: 'feature',
        details: `Created category: ${data.name}`
      });
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category');
    }
  };

  // Update a category
  const handleUpdateCategory = async (categoryId: string, data: Partial<DocumentCategory>) => {
    try {
      const categoryRef = doc(db, DOCS_CATEGORIES_COLLECTION, categoryId);
      
      // Update in Firestore
      await updateDoc(categoryRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId ? { ...cat, ...data, updatedAt: new Date().toISOString() } : cat
        )
      );
      
      setEditingCategory(null);
      
      // Create log entry
      await createLogEntry({
        userId: user?.id || 'unknown',
        username: user?.email || 'unknown',
        action: 'Updated Documentation Category',
        category: 'feature',
        details: `Updated category: ${data.name || categoryId}`
      });
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Failed to update category');
    }
  };

  // Delete a category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this category? All documents in this category will be moved to the General category.')) {
        return;
      }
      
      // Get category name for logging
      const category = categories.find(c => c.id === categoryId);
      
      // Move all documents in this category to the General category
      const docsToUpdate = documents.filter(doc => doc.categoryId === categoryId);
      for (const doc of docsToUpdate) {
        const docRef = doc(db, DOCS_COLLECTION, doc.id);
        await updateDoc(docRef, {
          categoryId: 'general',
          updatedAt: serverTimestamp()
        });
      }
      
      // Delete the category
      await deleteDoc(doc(db, DOCS_CATEGORIES_COLLECTION, categoryId));
      
      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setDocuments(prev => 
        prev.map(doc => 
          doc.categoryId === categoryId ? { ...doc, categoryId: 'general', updatedAt: new Date().toISOString() } : doc
        )
      );
      
      // Create log entry
      await createLogEntry({
        userId: user?.id || 'unknown',
        username: user?.email || 'unknown',
        action: 'Deleted Documentation Category',
        category: 'feature',
        details: `Deleted category: ${category?.name || categoryId}`
      });
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category');
    }
  };

  // Add a new document
  const handleAddDocument = async (data: Omit<DocumentFile, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    try {
      const documentId = `doc-${Date.now()}`;
      const newDocument: DocumentFile = {
        id: documentId,
        ...data,
        createdBy: user?.email || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await setDoc(doc(db, DOCS_COLLECTION, documentId), {
        ...newDocument,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
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
      setError('Failed to add document');
    }
  };

  // Delete a document
  const handleDeleteDocument = async (documentId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this document?')) {
        return;
      }
      
      // Get document for logging
      const document = documents.find(d => d.id === documentId);
      
      // Delete from Firestore
      await deleteDoc(doc(db, DOCS_COLLECTION, documentId));
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Create log entry
      await createLogEntry({
        userId: user?.id || 'unknown',
        username: user?.email || 'unknown',
        action: 'Deleted Documentation',
        category: 'feature',
        details: `Deleted document: ${document?.title || documentId}`
      });
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
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
        return <File className="w-10 h-10 text-green-600" />;
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
          <FileText className="w-6 h-6 text-cyan-600" />
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
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
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
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-cyan-100 text-cyan-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-cyan-100 text-cyan-700' : 'text-gray-500 hover:bg-gray-100'}`}
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
              ? 'bg-cyan-100 text-cyan-800' 
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
                  ? 'bg-cyan-100 text-cyan-800' 
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
              
              {category.id !== 'general' && (
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
          <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
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
                        <p className="text-xs text-cyan-600">{getCategoryName(doc.categoryId)}</p>
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
                      <span className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs">
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

      {/* Document Viewer */}
      {viewingDocument && (
        <DocumentViewer 
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}