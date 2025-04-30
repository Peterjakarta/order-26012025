import React, { useState } from 'react';
import { X, Edit2, ArrowUpRight, Calendar, Star, FileText, Check, AlertCircle, ChevronLeft, ChevronRight, ClipboardList, FileDown } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDProduct, TestResult } from '../../types/rd-types';
import ConfirmDialog from '../common/ConfirmDialog';
import Beaker from '../common/BeakerIcon';

interface RDProductDetailsProps {
  product: RDProduct;
  onClose: () => void;
  onEdit: () => void;
  onApprove: () => void;
}

export default function RDProductDetails({ 
  product,
  onClose,
  onEdit,
  onApprove
}: RDProductDetailsProps) {
  const { categories } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Demo test results data
  const testResults: TestResult[] = product.testResults || [
    {
      id: 'test-1',
      date: '2025-02-15',
      tester: 'John Doe',
      result: 'pass',
      comments: 'Flavor profile is excellent. Texture is smooth and consistent.'
    },
    {
      id: 'test-2',
      date: '2025-02-20',
      tester: 'Jane Smith',
      result: product.status === 'rejected' ? 'fail' : 'pass',
      comments: product.status === 'rejected' 
        ? 'Shelf life testing showed instability after 2 weeks. Need to reformulate.'
        : 'Shelf life testing confirmed 3-week stability at room temperature.'
    }
  ];

  const images = product.imageUrls || [];
  
  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex + 1 >= images.length ? 0 : prevIndex + 1
    );
  };
  
  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const renderTestResultBadge = (result: 'pass' | 'fail' | 'pending') => {
    const config = {
      pass: { bg: 'bg-green-100', text: 'text-green-800' },
      fail: { bg: 'bg-red-100', text: 'text-red-800' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-800' }
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config[result].bg} ${config[result].text}`}>
        {result.charAt(0).toUpperCase() + result.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">{product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid lg:grid-cols-2 gap-6 p-6">
            {/* Images */}
            <div className="space-y-4">
              {images.length > 0 ? (
                <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={images[currentImageIndex]} 
                    alt={`${product.name} - Image ${currentImageIndex + 1}`} 
                    className="w-full h-full object-contain"
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 text-white rounded-full hover:bg-black/50"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 text-white rounded-full hover:bg-black/50"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, index) => (
                          <button 
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                            aria-label={`View image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <Beaker className="w-16 h-16 text-gray-300" />
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-2">
                {images.map((url, index) => (
                  <div 
                    key={index} 
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-20 bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === currentImageIndex ? 'border-cyan-500' : 'border-transparent'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Details */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
                    product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                    'bg-cyan-100 text-cyan-800'}`}
                  >
                    {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-600">
                    Category: {categories[product.category]?.name || product.category}
                  </span>
                </div>
                
                <p className="text-gray-700">{product.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Development Date</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                    {new Date(product.developmentDate).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Target Production</div>
                  <div className="font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 text-cyan-600" />
                    {product.targetProductionDate 
                      ? new Date(product.targetProductionDate).toLocaleDateString()
                      : 'Not set'}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Unit</div>
                  <div className="font-medium">{product.unit || 'N/A'}</div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="font-medium">${product.price?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
              
              {product.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    Development Notes
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{product.notes}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-cyan-600" />
                  Test Results
                </h4>
                
                {testResults.length > 0 ? (
                  <div className="space-y-3">
                    {testResults.map(test => (
                      <div key={test.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium">{new Date(test.date).toLocaleDateString()}</div>
                          {renderTestResultBadge(test.result)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          Tester: {test.tester}
                        </div>
                        <p className="text-sm">{test.comments}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No test results yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div>
            <button
              onClick={() => onEdit()}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              <Edit2 className="w-4 h-4" />
              Edit Product
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.alert("Export functionality coming soon!")}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              <FileDown className="w-4 h-4" />
              Export Details
            </button>
            
            {product.status !== 'approved' && product.status !== 'rejected' && (
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
              >
                <ArrowUpRight className="w-4 h-4" />
                Approve for Production
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="Approve for Production"
        message={`Are you sure you want to approve "${product.name}" for production? This will mark the product as ready to move to the regular product catalog.`}
        onConfirm={() => {
          setShowApproveConfirm(false);
          onApprove();
        }}
        onCancel={() => setShowApproveConfirm(false)}
      />
    </div>
  );
}