import React, { useEffect, useState } from 'react';
import { X, Download, FileText, FileSpreadsheet, File, Calendar, User, Tag, Info } from 'lucide-react';
import type { DocumentFile } from './DocumentationManagement';
import { getDocumentUrl } from '../../../lib/supabase-client';

interface DocumentViewerProps {
  documentFile: DocumentFile;
  onClose: () => void;
}

export default function DocumentViewer({ documentFile, onClose }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the document URL from Supabase
    const fetchDocumentUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get the URL from Supabase
        try {
          const url = await getDocumentUrl(documentFile.fileUrl);
          setDocumentUrl(url);
        } catch (err) {
          console.error('Error getting document URL from Supabase:', err);
          
          // Fallback to using the stored URL directly
          setDocumentUrl(documentFile.fileUrl);
        }
      } catch (err) {
        console.error('Error fetching document URL:', err);
        setError('Failed to load document. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocumentUrl();
  }, [documentFile]);
  
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-12 h-12 text-green-600" />;
      default:
        return <File className="w-12 h-12 text-gray-600" />;
    }
  };

  const handleDownload = () => {
    if (!documentUrl) {
      setError('Document URL not available. Please try again later.');
      return;
    }
    
    // Create a link to download the file
    const link = window.document.createElement('a');
    link.href = documentUrl;
    link.download = documentFile.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            {getFileIcon(documentFile.fileType)}
            <div>
              <h2 className="text-xl font-semibold">{documentFile.title}</h2>
              <p className="text-sm text-gray-600">
                {documentFile.fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Document Metadata */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Document Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Date Added</p>
                      <p className="text-sm text-gray-500">{new Date(documentFile.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Added By</p>
                      <p className="text-sm text-gray-500">{documentFile.createdBy}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Tag className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">File Type</p>
                      <p className="text-sm text-gray-500 capitalize">{documentFile.fileType}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">File Size</p>
                      <p className="text-sm text-gray-500">--</p> {/* In a real app, we'd display file size here */}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Document Description */}
              {documentFile.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">{documentFile.description}</p>
                </div>
              )}
              
              {/* PDF Preview */}
              {documentFile.fileType === 'pdf' && documentUrl && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                  <div className="bg-gray-100 rounded-lg overflow-hidden border h-[500px]">
                    <iframe src={documentUrl} className="w-full h-full"></iframe>
                  </div>
                </div>
              )}
              
              {/* Excel preview would go here in a real application */}
              {documentFile.fileType === 'excel' && (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <FileSpreadsheet className="w-16 h-16 text-green-600 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3">Excel files cannot be previewed directly. Please download the file to view it.</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel File
                  </button>
                </div>
              )}
              
              {/* Generic file type placeholder */}
              {documentFile.fileType === 'other' && (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3">This file type cannot be previewed. Please download the file to view it.</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t bg-gray-50">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download File
          </button>
        </div>
      </div>
    </div>
  );
}