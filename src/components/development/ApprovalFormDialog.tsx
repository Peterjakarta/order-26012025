import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileDown, Calendar, Clipboard, ClipboardList, Users, FileText, Plus, Trash2, Upload, Check } from 'lucide-react';
import { ImageIcon } from 'lucide-react'; // Renamed to avoid conflict with the browser's Image constructor
import { RDProduct, TestResult } from '../../types/rd-types';
import { useStore } from '../../store/StoreContext';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/dateUtils';
import { generateRDApprovalPDF } from '../../utils/rdApprovalForm';
import { formatIDR } from '../../utils/currencyFormatter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  getFirestore
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ApprovalFormDialogProps {
  product: RDProduct;
  onClose: () => void;
}

export default function ApprovalFormDialog({ product, onClose }: ApprovalFormDialogProps) {
  const { recipes, ingredients, categories } = useStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Find recipe for this product
  const recipe = recipes.find(r => r.productId === product.id);
  
  // Find test results
  const testResults = product.testResults || [];
  const hasPassedTests = testResults.some(test => test.result === 'pass');
  
  // State for form data
  const [formData, setFormData] = useState({
    productName: product.name,
    productCode: product.id.slice(0, 12),
    description: product.description || '',
    developmentDate: product.developmentDate,
    targetDate: product.targetProductionDate || '',
    createdBy: product.createdBy || 'R&D Department',
    division: 'Product Development',
    approvalNotes: '',
    approver: 'Eko B. Handoko',
    approverTitle: 'Chief Executive Officer',
    includeRecipe: true,
    includeTestResults: true,
    yield: recipe?.yield || product.minOrder || 1,
    yieldUnit: recipe?.yieldUnit || product.unit || 'pcs'
  });

  // State for image uploads
  const [images, setImages] = useState<string[]>(product.imageUrls || []);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Handle file input change for image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/png')) {
      setError('Please select a JPG or PNG image file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(`File size should be less than 5MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
      return;
    }
    
    // Read the file as a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setImages(prev => [...prev, e.target.result]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove an image
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Calculate recipe cost if available
  const recipeCost = React.useMemo(() => {
    if (!recipe) return null;
    
    let totalCost = 0;
    recipe.ingredients.forEach(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (ingredient) {
        const unitPrice = ingredient.price / ingredient.packageSize;
        totalCost += unitPrice * item.amount;
      }
    });
    
    return totalCost;
  }, [recipe, ingredients]);

  // Save approval form to Firestore
  const handleSaveToFirestore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('You must be logged in to save an approval form');
      }
      
      const approvalFormData = {
        productId: product.id,
        productName: formData.productName,
        createdBy: user.id,
        creatorEmail: user.email,
        formData: formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending',
        testResults: formData.includeTestResults ? testResults : [],
        hasRecipe: formData.includeRecipe && !!recipe,
        imageUrls: images,
        yield: formData.yield,
        yieldUnit: formData.yieldUnit
      };
      
      // Save to Firestore approvalForms collection
      const approvalFormsRef = collection(db, 'approvalForms');
      await addDoc(approvalFormsRef, approvalFormData);
      
      setSuccess('Approval form saved successfully!');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving approval form:', err);
      
      if (err instanceof Error) {
        // Handle Firebase permission errors specifically
        if (err.message.includes('permission-denied') || err.message.includes('insufficient permissions')) {
          setError('You do not have permission to save approval forms. Please contact your administrator.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while saving the approval form');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF with form data
  const handleGeneratePDF = () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create customized product data for the PDF generation
      const customizedProduct: RDProduct = {
        ...product,
        name: formData.productName,
        description: formData.description,
        developmentDate: formData.developmentDate,
        targetProductionDate: formData.targetDate,
        createdBy: formData.createdBy,
        imageUrls: images,
        minOrder: formData.yield, // Add yield value
        unit: formData.yieldUnit, // Add yield unit
        // Only include test results if enabled
        testResults: formData.includeTestResults ? testResults : [],
        // Include recipe ingredients if available
        recipeIngredients: recipe ? recipe.ingredients.map(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          return {
            ingredientId: item.ingredientId,
            ingredientName: ingredient?.name || "Unknown Ingredient", // Add name for display
            amount: item.amount,
            unit: ingredient?.unit || ""
          };
        }) : product.recipeIngredients ? product.recipeIngredients.map(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          return {
            ...item,
            ingredientName: ingredient?.name || "Unknown Ingredient", // Add name for display
            unit: ingredient?.unit || ""
          };
        }) : []
      };

      // Generate the PDF with the custom data
      const doc = generateRDApprovalPDF(customizedProduct, formData.approver);
      
      // If recipe should be included, add it to the PDF
      if (formData.includeRecipe && (recipe || (product.recipeIngredients && product.recipeIngredients.length > 0))) {
        // Add recipe details on a new page
        doc.addPage();
        
        // Add recipe header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIPE INFORMATION', 14, 20);
        
        // Add recipe details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        
        if (recipe) {
          doc.text(`Recipe Name: ${recipe.name}`, 14, 35);
          doc.text(`Yield: ${recipe.yield} ${recipe.yieldUnit}`, 14, 45);
          
          if (recipeCost !== null) {
            doc.text(`Estimated Cost: ${formatIDR(recipeCost)}`, 14, 55);
          }
          
          // Add ingredients table
          if (recipe.ingredients.length > 0) {
            const tableData = recipe.ingredients.map(item => {
              const ingredient = ingredients.find(i => i.id === item.ingredientId);
              return [
                ingredient?.name || 'Unknown',
                item.amount.toString(),
                ingredient?.unit || '-'
              ];
            });
            
            // Add ingredients table
            autoTable(doc, {
              startY: 65,
              head: [['Ingredient', 'Amount', 'Unit']],
              body: tableData,
              theme: 'striped',
              headStyles: { fillColor: [0, 128, 128] }
            });
          }
          
          // Add recipe notes if available
          if (recipe.notes) {
            const currentY = (doc as any).lastAutoTable?.finalY || 150;
            doc.text('Preparation Instructions:', 14, currentY + 10);
            
            // Split the notes to fit on the page
            const splitNotes = doc.splitTextToSize(recipe.notes, 180);
            doc.text(splitNotes, 14, currentY + 20);
          }
        } else if (product.recipeIngredients && product.recipeIngredients.length > 0) {
          // Use product recipe ingredients if no formal recipe exists
          doc.text(`Recipe for: ${product.name}`, 14, 35);
          
          if (product.costEstimate) {
            doc.text(`Estimated Cost: ${formatIDR(product.costEstimate)}`, 14, 45);
          }
          
          // Add ingredients table
          const tableData = product.recipeIngredients.map(item => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            return [
              ingredient?.name || 'Unknown',
              item.amount.toString(),
              ingredient?.unit || '-'
            ];
          });
          
          // Add ingredients table
          autoTable(doc, {
            startY: 55,
            head: [['Ingredient', 'Amount', 'Unit']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 128, 128] }
          });
        }
      }
      
      // Add test results if enabled
      if (formData.includeTestResults && testResults.length > 0) {
        // Add a new page
        doc.addPage();
        
        // Add test results header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TEST RESULTS', 14, 20);
        
        // Create test results table data
        const testTableData = testResults.map(test => [
          formatDate(test.date),
          test.tester,
          test.result.toUpperCase(),
          test.comments
        ]);
        
        // Add test results table
        autoTable(doc, {
          startY: 30,
          head: [['Date', 'Tester', 'Result', 'Comments']],
          body: testTableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 128, 128] }
        });
      }
      
      // Add approval notes if provided
      if (formData.approvalNotes) {
        const currentPage = doc.getNumberOfPages();
        doc.setPage(currentPage);
        
        const currentY = doc.internal.pageSize.height - 60;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Additional Approval Notes:', 14, currentY);
        
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(formData.approvalNotes, 180);
        doc.text(splitNotes, 14, currentY + 10);
      }
      
      // Save the PDF
      doc.save(`${formData.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-approval-form.pdf`);
      
    } catch (err) {
      console.error('Error generating approval PDF:', err);
      setError('Failed to generate approval form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-semibold">Edit Approval Form</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500\" xmlns="http://www.w3.org/2000/svg\" viewBox="0 0 20 20\" fill="currentColor\" aria-hidden="true">
                    <path fillRule="evenodd\" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z\" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {!hasPassedTests && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Warning:</strong> This product doesn't have any passed test results. It's recommended to complete testing before approval.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600" />
                Basic Information
              </h3>
              
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Name
                </label>
                <input
                  id="productName"
                  name="productName"
                  type="text"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="productCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Code
                </label>
                <input
                  id="productCode"
                  name="productCode"
                  type="text"
                  value={formData.productCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Dates & Creator
              </h3>
              
              <div>
                <label htmlFor="developmentDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Development Date
                </label>
                <input
                  id="developmentDate"
                  name="developmentDate"
                  type="date"
                  value={formData.developmentDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Production Date
                </label>
                <input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="createdBy" className="block text-sm font-medium text-gray-700 mb-1">
                  Created By
                </label>
                <input
                  id="createdBy"
                  name="createdBy"
                  type="text"
                  value={formData.createdBy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                  Division
                </label>
                <input
                  id="division"
                  name="division"
                  type="text"
                  value={formData.division}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
          
          {/* Yield Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyan-600" />
              Yield Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="yield" className="block text-sm font-medium text-gray-700 mb-1">
                  Yield Amount
                </label>
                <input
                  id="yield"
                  name="yield"
                  type="number"
                  min="1"
                  value={formData.yield}
                  onChange={(e) => setFormData(prev => ({ ...prev, yield: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="yieldUnit" className="block text-sm font-medium text-gray-700 mb-1">
                  Yield Unit
                </label>
                <input
                  id="yieldUnit"
                  name="yieldUnit"
                  type="text"
                  value={formData.yieldUnit}
                  onChange={(e) => setFormData(prev => ({ ...prev, yieldUnit: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
          
          {/* Image Upload Section - Replacing Menu Sections */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-600" />
              Product Images
            </h3>
            
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Upload JPG or PNG images for the product (max file size: 5MB)
                </p>
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">JPG or PNG only</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file" 
                      className="hidden"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>
              
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 text-green-700 rounded-md">
                  <Check className="w-5 h-5" />
                  <span>Image uploaded successfully!</span>
                </div>
              )}
              
              {images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Images ({images.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border overflow-hidden bg-white">
                          <img 
                            src={image} 
                            alt={`Product image ${index + 1}`} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Recipe Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyan-600" />
              Recipe Information
            </h3>
            
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-gray-700">Recipe Details</h4>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="includeRecipe"
                    checked={formData.includeRecipe}
                    onChange={handleCheckboxChange}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Include in PDF</span>
                </label>
              </div>
              
              {recipe ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Recipe Name</p>
                      <p className="text-sm text-gray-600">{recipe.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Yield</p>
                      <p className="text-sm text-gray-600">{recipe.yield} {recipe.yieldUnit}</p>
                    </div>
                  </div>
                  
                  {recipe.ingredients.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Ingredients</p>
                      <div className="bg-white p-3 rounded border max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {recipe.ingredients.map((item, idx) => {
                              const ingredient = ingredients.find(i => i.id === item.ingredientId);
                              if (!ingredient) return null;
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{ingredient.name}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{ingredient.unit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {recipeCost !== null && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estimated Cost</p>
                      <p className="text-sm text-cyan-600 font-medium">{formatIDR(recipeCost)}</p>
                    </div>
                  )}
                  
                  {recipe.notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Preparation Instructions</p>
                      <div className="bg-white p-3 rounded border text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {recipe.notes}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // If no Recipe exists, show the RDProduct's recipeIngredients if available
                product.recipeIngredients && product.recipeIngredients.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Ingredients from R&D Product</p>
                      <div className="bg-white p-3 rounded border max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {product.recipeIngredients.map((item, idx) => {
                              const ingredient = ingredients.find(i => i.id === item.ingredientId);
                              if (!ingredient) return null;
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{ingredient.name}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{item.amount}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{ingredient.unit}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {product.costEstimate && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Estimated Cost</p>
                        <p className="text-sm text-cyan-600 font-medium">{formatIDR(product.costEstimate)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recipe information available for this product.</p>
                  </div>
                )
              )}
            </div>
          </div>
          
          {/* Test Results Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyan-600" />
              Test Results
            </h3>
            
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-gray-700">Test Results</h4>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="includeTestResults"
                    checked={formData.includeTestResults}
                    onChange={handleCheckboxChange}
                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Include in PDF</span>
                </label>
              </div>
              
              {testResults.length > 0 ? (
                <div className="bg-white p-3 rounded border max-h-60 overflow-y-auto">
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
                      {testResults.map((test, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${
                          test.result === 'pass' ? 'bg-green-50' : 
                          test.result === 'fail' ? 'bg-red-50' : ''
                        }`}>
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
              ) : (
                <div className="text-center py-6">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No test results available for this product.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              Approval Information
            </h3>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div>
                <label htmlFor="approver" className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Name
                </label>
                <input
                  id="approver"
                  name="approver"
                  type="text"
                  value={formData.approver}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div>
                <label htmlFor="approverTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Approver Title
                </label>
                <input
                  id="approverTitle"
                  name="approverTitle"
                  type="text"
                  value={formData.approverTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="approvalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Approval Notes
              </label>
              <textarea
                id="approvalNotes"
                name="approvalNotes"
                value={formData.approvalNotes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Add any notes related to the approval (optional)"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveToFirestore}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Form'}
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {loading ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}