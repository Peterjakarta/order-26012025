import React, { useState, useEffect } from 'react';
import { useApprovalForms } from '../../hooks/useApprovalForms';
import { Check, AlertCircle, Clock, FileText, Eye, Clipboard, Download, Search, Filter, X } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { ApprovalForm } from '../../types/types';
import { RDProduct } from '../../types/rd-types';
import { generateRDApprovalPDF } from '../../utils/rdApprovalForm';
import ApprovalFormDialog from './ApprovalFormDialog';

interface ApprovalsTabProps {
  selectedProductId?: string;
}

export default function ApprovalsTab({ selectedProductId }: ApprovalsTabProps) {
  const { approvalForms, loading, error } = useApprovalForms();
  const [filteredForms, setFilteredForms] = useState<ApprovalForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [viewingForm, setViewingForm] = useState<ApprovalForm | null>(null);
  const [editingForm, setEditingForm] = useState<RDProduct | null>(null);
  
  // Filter approvals based on search term, status filter, and selected product
  useEffect(() => {
    let filtered = approvalForms;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => form.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        form => form.productName.toLowerCase().includes(term) || 
                form.creatorEmail.toLowerCase().includes(term)
      );
    }
    
    // Filter by selected product
    if (selectedProductId) {
      filtered = filtered.filter(form => form.productId === selectedProductId);
    }
    
    setFilteredForms(filtered);
  }, [approvalForms, searchTerm, statusFilter, selectedProductId]);
  
  const handleDownloadPDF = (form: ApprovalForm) => {
    try {
      // Create a product object from the form data
      const product: RDProduct = {
        id: form.productId,
        name: form.productName,
        category: form.formData?.category || 'unknown',
        description: form.formData?.description || '',
        unit: form.formData?.unit || form.yieldUnit || 'pcs',
        minOrder: form.formData?.minOrder || form.yield || 1,
        showPrice: !!form.formData?.showPrice,
        showDescription: !!form.formData?.showDescription,
        showMinOrder: !!form.formData?.showMinOrder,
        showUnit: !!form.formData?.showUnit,
        developmentDate: form.formData?.developmentDate || new Date().toISOString().split('T')[0],
        targetProductionDate: form.formData?.targetDate,
        status: 'approved',
        testResults: form.testResults,
        imageUrls: form.imageUrls,
        createdBy: form.creatorEmail,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        notes: form.formData?.notes,
      };
      
      // Generate PDF
      const doc = generateRDApprovalPDF(product, form.formData?.approver || "Eko B. Handoko");
      
      // Save PDF
      doc.save(`${form.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-approval-form.pdf`);
    } catch (err) {
      console.error('Error generating approval PDF:', err);
      alert('Failed to generate approval PDF');
    }
  };
  
  const handleEditForm = (form: ApprovalForm) => {
    // Convert form data to RDProduct for editing
    const product: RDProduct = {
      id: form.productId,
      name: form.productName,
      category: form.formData?.category || 'unknown',
      description: form.formData?.description || '',
      unit: form.formData?.unit || form.yieldUnit || 'pcs',
      minOrder: form.formData?.minOrder || form.yield || 1,
      showPrice: !!form.formData?.showPrice,
      showDescription: !!form.formData?.showDescription,
      showMinOrder: !!form.formData?.showMinOrder,
      showUnit: !!form.formData?.showUnit,
      developmentDate: form.formData?.developmentDate || new Date().toISOString().split('T')[0],
      targetProductionDate: form.formData?.targetDate,
      status: 'approved',
      testResults: form.testResults,
      imageUrls: form.imageUrls,
      createdBy: form.creatorEmail,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      notes: form.formData?.notes,
    };
    
    setEditingForm(product);
  };
  
  const getStatusBadge = (status: ApprovalForm['status']) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-transparent border-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading approvals...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium">Filter Approvals</h3>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by product name or creator"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-48 p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {filteredForms.length > 0 ? (
        <div className="space-y-4">
          {filteredForms.map(form => (
            <div key={form.id} className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{form.productName}</h3>
                      {getStatusBadge(form.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clipboard className="w-4 h-4" />
                        <span>Form ID: {form.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>Product ID: {form.productId.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Created: {formatDate(form.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Created by:</span> {form.creatorEmail}
                    </div>
                    
                    {form.status === 'approved' && form.approvedBy && (
                      <div className="text-sm text-green-600">
                        <span className="font-medium">Approved by:</span> {form.approvedBy}
                        {form.approvedAt && (
                          <span> on {formatDate(form.approvedAt)}</span>
                        )}
                      </div>
                    )}
                    
                    {form.status === 'rejected' && form.approvedBy && (
                      <div className="text-sm text-red-600">
                        <span className="font-medium">Rejected by:</span> {form.approvedBy}
                        {form.approvedAt && (
                          <span> on {formatDate(form.approvedAt)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setViewingForm(form)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    
                    <button
                      onClick={() => handleEditForm(form)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                    >
                      <Clipboard className="w-4 h-4" />
                      Edit Form
                    </button>
                    
                    <button
                      onClick={() => handleDownloadPDF(form)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <Clipboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No approval forms found</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? "No forms match your search criteria. Try adjusting your filters."
              : selectedProductId 
                ? "No approval forms for this product yet."
                : "No approval forms have been created yet."}
          </p>
        </div>
      )}
      
      {viewingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Approval Form Details</h2>
              <button
                onClick={() => setViewingForm(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium mb-1">{viewingForm.productName}</h3>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(viewingForm.status)}
                    <span className="text-sm text-gray-500">Product ID: {viewingForm.productId.slice(0, 8)}</span>
                  </div>
                </div>
                
                <div>
                  <button
                    onClick={() => handleDownloadPDF(viewingForm)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
              
              {/* Form contents - structured display of form fields */}
              <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Product Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Product Name</dt>
                      <dd>{viewingForm.productName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Description</dt>
                      <dd>{viewingForm.formData?.description || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Category</dt>
                      <dd>{viewingForm.formData?.category || "N/A"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Yield</dt>
                      <dd>{viewingForm.yield || viewingForm.formData?.minOrder || "N/A"} {viewingForm.yieldUnit || viewingForm.formData?.unit || "pcs"}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Development Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Created By</dt>
                      <dd>{viewingForm.creatorEmail}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Created Date</dt>
                      <dd>{formatDate(viewingForm.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Development Date</dt>
                      <dd>{formatDate(viewingForm.formData?.developmentDate)}</dd>
                    </div>
                    {viewingForm.formData?.targetDate && (
                      <div>
                        <dt className="font-medium text-gray-500">Target Production Date</dt>
                        <dd>{formatDate(viewingForm.formData.targetDate)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                {/* Additional sections based on form data */}
                {viewingForm.hasRecipe && (
                  <div className="col-span-1 md:col-span-2">
                    <h4 className="font-medium mb-3">Recipe Information</h4>
                    <p className="text-sm text-gray-600">
                      This product has a recipe defined. View the complete details in the PDF export.
                    </p>
                  </div>
                )}
                
                {viewingForm.testResults && viewingForm.testResults.length > 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <h4 className="font-medium mb-3">Test Results</h4>
                    <div className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tester</th>
                            <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewingForm.testResults.map((test, idx) => (
                            <tr key={idx} className={`
                              ${test.result === 'pass' ? 'bg-green-50' : 
                                test.result === 'fail' ? 'bg-red-50' : ''}
                            `}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{formatDate(test.date)}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{test.tester}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  test.result === 'pass' ? 'bg-green-100 text-green-800' : 
                                  test.result === 'fail' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {test.result.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">{test.comments}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {viewingForm.imageUrls && viewingForm.imageUrls.length > 0 && (
                  <div className="col-span-1 md:col-span-2">
                    <h4 className="font-medium mb-3">Images</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {viewingForm.imageUrls.map((url, idx) => (
                        <div key={idx} className="aspect-square rounded-lg border overflow-hidden bg-white">
                          <img 
                            src={url} 
                            alt={`Product image ${idx + 1}`} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="col-span-1 md:col-span-2">
                  <h4 className="font-medium mb-3">Approval Information</h4>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">Status</dt>
                      <dd>
                        {viewingForm.status === 'approved' ? (
                          <span className="text-green-600">Approved</span>
                        ) : viewingForm.status === 'rejected' ? (
                          <span className="text-red-600">Rejected</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </dd>
                    </div>
                    
                    {viewingForm.approvedBy && (
                      <>
                        <div>
                          <dt className="font-medium text-gray-500">
                            {viewingForm.status === 'approved' ? 'Approved By' : 'Reviewed By'}
                          </dt>
                          <dd>{viewingForm.approvedBy}</dd>
                        </div>
                        
                        {viewingForm.approvedAt && (
                          <div>
                            <dt className="font-medium text-gray-500">
                              {viewingForm.status === 'approved' ? 'Approved On' : 'Reviewed On'}
                            </dt>
                            <dd>{formatDate(viewingForm.approvedAt)}</dd>
                          </div>
                        )}
                      </>
                    )}
                    
                    {viewingForm.approverNotes && (
                      <div>
                        <dt className="font-medium text-gray-500">Notes</dt>
                        <dd className="bg-gray-50 p-3 rounded-lg mt-1 whitespace-pre-line">
                          {viewingForm.approverNotes}
                        </dd>
                      </div>
                    )}
                    
                    <div>
                      <dt className="font-medium text-gray-500">Approver</dt>
                      <dd>{viewingForm.formData?.approver || "Eko B. Handoko"}</dd>
                    </div>
                    
                    <div>
                      <dt className="font-medium text-gray-500">Approver Title</dt>
                      <dd>{viewingForm.formData?.approverTitle || "Chief Executive Officer"}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setViewingForm(null)}
                className="px-4 py-2 border rounded-md hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {editingForm && (
        <ApprovalFormDialog
          product={editingForm}
          onClose={() => setEditingForm(null)}
        />
      )}
    </div>
  );
}