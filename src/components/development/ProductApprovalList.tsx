import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, ChevronRight, ChevronDown, Filter, X, FileDown, Check, Clipboard 
} from 'lucide-react';
import { useApprovalForms } from '../../hooks/useApprovalForms';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../hooks/useAuth';

export default function ProductApprovalList() {
  const { approvalForms, loading, error, updateApprovalStatus } = useApprovalForms();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedForm, setExpandedForm] = useState<string | null>(null);
  const [approvingForm, setApprovingForm] = useState<string | null>(null);
  const [rejectingForm, setRejectingForm] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Check if user can approve forms
  const canApprove = hasPermission('manage_products');
  
  // Filter forms based on search and status
  const filteredForms = approvalForms.filter(form => {
    // Status filter
    if (statusFilter !== 'all' && form.status !== statusFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return form.productName.toLowerCase().includes(term) || 
             form.creatorEmail.toLowerCase().includes(term);
    }
    
    return true;
  });
  
  // Handle approval
  const handleApprove = async (formId: string) => {
    try {
      await updateApprovalStatus(formId, 'approved', approvalNotes);
      setApprovingForm(null);
      setApprovalNotes('');
    } catch (err) {
      console.error('Error approving form:', err);
      alert('Failed to approve form');
    }
  };
  
  // Handle rejection
  const handleReject = async (formId: string) => {
    try {
      await updateApprovalStatus(formId, 'rejected', approvalNotes);
      setRejectingForm(null);
      setApprovalNotes('');
    } catch (err) {
      console.error('Error rejecting form:', err);
      alert('Failed to reject form');
    }
  };
  
  // Get status badge component
  const getStatusBadge = (status: string) => {
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
      <div className="flex justify-center items-center p-12">
        <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-cyan-600" />
          <h2 className="text-xl font-semibold">Product Approval Forms</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search forms..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-40 p-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
            <div key={form.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div 
                className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-start"
                onClick={() => setExpandedForm(expandedForm === form.id ? null : form.id)}
              >
                <div className="flex items-start gap-3">
                  {expandedForm === form.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 mt-1" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 mt-1" />
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{form.productName}</h3>
                      {getStatusBadge(form.status)}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      <p>Created by {form.creatorEmail} on {formatDate(form.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {form.status === 'pending' && canApprove && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setApprovingForm(form.id);
                        }}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 inline-block mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectingForm(form.id);
                        }}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        <X className="w-4 h-4 inline-block mr-1" />
                        Reject
                      </button>
                    </>
                  )}
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Download PDF logic
                    }}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                  >
                    <FileDown className="w-4 h-4 inline-block mr-1" />
                    PDF
                  </button>
                </div>
              </div>
              
              {expandedForm === form.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Product Information</h4>
                      <div className="bg-white p-3 rounded-lg border space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Product ID:</span> {form.productId}
                        </p>
                        <p>
                          <span className="font-medium">Description:</span> {form.formData?.description || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">Yield:</span> {form.yield || form.formData?.minOrder || "N/A"} {form.yieldUnit || form.formData?.unit || "pcs"}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Approval Information</h4>
                      <div className="bg-white p-3 rounded-lg border space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Status:</span> {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                        </p>
                        
                        {form.status !== 'pending' && form.approvedBy && (
                          <>
                            <p>
                              <span className="font-medium">{form.status === 'approved' ? 'Approved' : 'Rejected'} by:</span> {form.approvedBy}
                            </p>
                            {form.approvedAt && (
                              <p>
                                <span className="font-medium">Date:</span> {formatDate(form.approvedAt)}
                              </p>
                            )}
                          </>
                        )}
                        
                        {form.approverNotes && (
                          <div>
                            <p className="font-medium">Notes:</p>
                            <p className="bg-gray-50 p-2 rounded-lg mt-1 whitespace-pre-line">{form.approverNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional form details like test results, images, etc. could go here */}
                </div>
              )}
              
              {/* Approval confirmation dialog */}
              {approvingForm === form.id && (
                <div className="border-t p-4 bg-green-50">
                  <h4 className="font-medium mb-2 text-green-800">Approve Form</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Are you sure you want to approve this form? This action can't be undone.
                  </p>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-green-800 mb-1">
                      Approval Notes (Optional)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={e => setApprovalNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Add any notes or comments regarding this approval..."
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setApprovingForm(null);
                        setApprovalNotes('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleApprove(form.id)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Confirm Approval
                    </button>
                  </div>
                </div>
              )}
              
              {/* Rejection confirmation dialog */}
              {rejectingForm === form.id && (
                <div className="border-t p-4 bg-red-50">
                  <h4 className="font-medium mb-2 text-red-800">Reject Form</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Are you sure you want to reject this form? This action can't be undone.
                  </p>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      Rejection Reason (Required)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={e => setApprovalNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                      placeholder="Please provide a reason for rejecting this form..."
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setRejectingForm(null);
                        setApprovalNotes('');
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(form.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      disabled={!approvalNotes.trim()}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
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
              : "No approval forms have been created yet."}
          </p>
        </div>
      )}
    </div>
  );
}