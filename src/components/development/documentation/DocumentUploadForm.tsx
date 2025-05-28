import React, { useState, useRef } from 'react';
import { AlertCircle, Upload, File, FileText, X, FileSpreadsheet } from 'lucide-react';
import type { DocumentCategory } from './DocumentationManager';

interface DocumentUploadFormProps {
  categories: DocumentCategory[];
  onSubmit: (data: {
    title: string;
    description?: string;
    fileName: string;
    fileUrl: string;
    fileType: 'pdf' | 'excel' | 'other';
    categoryId: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function DocumentUploadForm({ categories, onSubmit, onCancel }: DocumentUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'excel' | 'other'>('other');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      
      // Set title from filename if not already set
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(fileName);
      }
      
      // Determine file type
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'pdf') {
        setFileType('pdf');
      } else if (['xls', 'xlsx', 'csv'].includes(fileExtension || '')) {
        setFileType('excel');
      } else {
        setFileType('other');
      }
      
      // Create object URL for preview
      const fileUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(fileUrl);
    }
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-16 h-16 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-16 h-16 text-green-600" />;
      default:
        return <File className="w-16 h-16 text-gray-600" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!categoryId) {
        setError('Please select a category');
        return;
      }
      
      if (!file) {
        setError('Please select a file to upload');
        return;
      }
      
      setLoading(true);
      
      // In a real application, we would upload the file to storage here
      // For this demo, we'll simulate file storage by using the file object URL
      const fileName = file.name;
      const fileUrl = previewUrl || '';
      
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        fileName,
        fileUrl,
        fileType,
        categoryId
      });
      
      // Clear form
      setTitle('');
      setDescription('');
      setCategoryId('');
      clearFile();
      
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while uploading');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="Enter document title"
            required
          />
        </div>
        
        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="Enter document description"
          />
        </div>
        
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            required
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            id="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.txt"
            required
          />
          
          <div 
            className="border-2 border-dashed rounded-lg p-6 transition-colors duration-300 hover:bg-cyan-50 hover:border-cyan-500 cursor-pointer flex flex-col items-center"
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  {getFileIcon()}
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-cyan-500 mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">Click to upload a file</p>
                <p className="text-xs text-gray-500">PDF, Excel, Word, or other document files</p>
                <p className="text-xs text-gray-500 mt-1">Maximum size: 10MB</p>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-50"
          disabled={loading || !file}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Document
            </>
          )}
        </button>
      </div>
    </form>
  );
}