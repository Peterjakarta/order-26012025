import React, { useState } from 'react';
import { X, Calendar, Star, FileText, FileSpreadsheet, FileDown, Check, ClipboardList } from 'lucide-react';
import { RDProduct } from '../../../types/rd-types';
import { useStore } from '../../../store/StoreContext';
import { formatIDR } from '../../../utils/currencyFormatter';
import Beaker from '../../../components/common/BeakerIcon';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RDProductDetailsPopupProps {
  product: RDProduct;
  onClose: () => void;
}

export default function RDProductDetailsPopup({ product, onClose }: RDProductDetailsPopupProps) {
  const { categories, recipes, ingredients } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get matching recipe if exists
  const recipe = recipes.find(r => r.productId === product.id);
  
  // Get the category name
  let categoryName = product.category;
  if (categories[product.category]) {
    categoryName = categories[product.category].name;
  } else if (product.category.startsWith('rd-category-')) {
    // Get R&D category names from localStorage
    try {
      const storedCategories = localStorage.getItem('rd-categories-data');
      if (storedCategories) {
        const rdCategories = JSON.parse(storedCategories);
        const category = rdCategories.find((c: any) => c.id === product.category);
        if (category) {
          categoryName = category.name;
        }
      }
    } catch (error) {
      console.error('Error fetching R&D category name:', error);
    }
  }

  const images = product.imageUrls || [];
  
  const handleDownloadExcel = () => {
    // Create Excel data
    const data = [
      ['R&D Product Details'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Product Information'],
      ['Name:', product.name],
      ['Category:', categoryName],
      ['Status:', product.status.charAt(0).toUpperCase() + product.status.slice(1)],
      ['Development Date:', new Date(product.developmentDate).toLocaleDateString()],
      ['Target Production Date:', product.targetProductionDate ? new Date(product.targetProductionDate).toLocaleDateString() : 'Not set'],
      [''],
      ['Cost & Pricing'],
      ['Unit:', product.unit || 'N/A'],
      ['Price:', product.price ? formatIDR(product.price) : 'N/A'],
      ['Min Order:', product.minOrder || 'N/A'],
      ['Cost Estimate:', product.costEstimate ? formatIDR(product.costEstimate) : 'N/A'],
      [''],
      ['Description:', product.description || ''],
      [''],
      ['Notes:', product.notes || '']
    ];
    
    // Generate and download Excel
    const wb = generateExcelData(data, 'RD Product Details');
    saveWorkbook(wb, `rd-product-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };
  
  const handleDownloadPDF = () => {
    // Create PDF document
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('R&D Product Details', 14, 15);
    
    // Basic product info
    doc.setFontSize(14);
    doc.text(product.name, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Category: ${categoryName}`, 14, 35);
    doc.text(`Status: ${product.status.charAt(0).toUpperCase() + product.status.slice(1)}`, 14, 42);
    doc.text(`Development Date: ${new Date(product.developmentDate).toLocaleDateString()}`, 14, 49);
    
    if (product.targetProductionDate) {
      doc.text(`Target Production Date: ${new Date(product.targetProductionDate).toLocaleDateString()}`, 14, 56);
    }
    
    // Cost table
    autoTable(doc, {
      startY: 65,
      head: [['Unit', 'Min Order', 'Price', 'Cost Estimate']],
      body: [[
        product.unit || 'N/A',
        product.minOrder?.toString() || 'N/A',
        product.price ? formatIDR(product.price) : 'N/A',
        product.costEstimate ? formatIDR(product.costEstimate) : 'N/A'
      ]],
      theme: 'striped',
      headStyles: {
        fillColor: [0, 183, 183],
        textColor: [255, 255, 255]
      }
    });
    
    // Description and notes
    let y = (doc as any).lastAutoTable.finalY + 10;
    
    if (product.description) {
      doc.setFontSize(12);
      doc.text('Description:', 14, y);
      y += 7;
      
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(product.description, 180);
      doc.text(splitDesc, 14, y);
      y += splitDesc.length * 5 + 10;
    }
    
    if (product.notes) {
      doc.setFontSize(12);
      doc.text('Development Notes:', 14, y);
      y += 7;
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(product.notes, 180);
      doc.text(splitNotes, 14, y);
      y += splitNotes.length * 5 + 10;
    }
    
    // Save PDF
    doc.save(`rd-product-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };
  
  const handleDownloadRecipe = () => {
    if (!recipe) {
      alert('No recipe information available for this product');
      return;
    }
    
    // Create PDF document for recipe
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Recipe Details', 14, 15);
    
    // Recipe info
    doc.setFontSize(14);
    doc.text(`${product.name} - Recipe`, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Yield: ${recipe.yield} ${recipe.yieldUnit}`, 14, 35);
    doc.text(`Category: ${categoryName}`, 14, 42);
    
    // Cost info
    let y = 55;
    doc.setFontSize(12);
    doc.text('Cost Information', 14, y);
    y += 7;
    
    const totalCost = (recipe.laborCost || 0) + (recipe.packagingCost || 0);
    const costPerUnit = totalCost / recipe.yield;
    
    doc.setFontSize(10);
    doc.text(`Labor Cost: ${formatIDR(recipe.laborCost || 0)}`, 14, y);
    y += 7;
    doc.text(`Packaging Cost: ${formatIDR(recipe.packagingCost || 0)}`, 14, y);
    y += 7;
    doc.text(`Total Cost: ${formatIDR(totalCost)}`, 14, y);
    y += 7;
    doc.text(`Cost per ${recipe.yieldUnit}: ${formatIDR(costPerUnit)}`, 14, y);
    y += 15;
    
    // Ingredients table
    if (recipe.ingredients.length > 0) {
      doc.setFontSize(12);
      doc.text('Ingredients', 14, y);
      y += 7;
      
      const ingredientRows = recipe.ingredients.map(item => {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        if (!ingredient) return [];
        
        // Calculate cost for this ingredient
        const unitPrice = ingredient.price / ingredient.packageSize;
        const cost = unitPrice * item.amount;
        
        return [
          ingredient.name,
          item.amount.toString(),
          ingredient.unit,
          formatIDR(unitPrice),
          formatIDR(cost)
        ];
      }).filter(row => row.length > 0);
      
      if (ingredientRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']],
          body: ingredientRows,
          theme: 'striped',
          headStyles: {
            fillColor: [236, 72, 153],
            textColor: [255, 255, 255]
          }
        });
        
        // Add recipe notes if present
        if (recipe.notes) {
          y = (doc as any).lastAutoTable.finalY + 10;
          
          doc.setFontSize(12);
          doc.text('Recipe Notes:', 14, y);
          y += 7;
          
          doc.setFontSize(10);
          const splitNotes = doc.splitTextToSize(recipe.notes, 180);
          doc.text(splitNotes, 14, y);
        }
      }
    }
    
    // Save PDF
    doc.save(`recipe-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-cyan-50">
          <div className="flex items-center gap-2">
            <Beaker className="w-6 h-6 text-cyan-600" />
            <div>
              <h2 className="text-xl font-semibold text-cyan-900">{product.name}</h2>
              <div className="flex items-center gap-2 text-sm text-cyan-800">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                  ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
                  product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                  'bg-cyan-100 text-cyan-800'}`}
                >
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
                <span>•</span>
                <span>{categoryName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-cyan-800 hover:text-cyan-950 hover:bg-cyan-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Images */}
            {images.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium mb-2">Product Images</h3>
                <div className="bg-gray-100 rounded-lg overflow-hidden h-48 flex items-center justify-center">
                  <img 
                    src={images[currentImageIndex]} 
                    alt={product.name} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((image, index) => (
                      <div 
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${
                          currentImageIndex === index ? 'border-cyan-500' : 'border-transparent'
                        }`}
                      >
                        <img 
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Product Info */}
            <div className="space-y-4">
              {product.description && (
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-700">{product.description}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <h3 className="font-medium">Development Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Development Date</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-600" />
                      <span>{new Date(product.developmentDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {product.targetProductionDate && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Target Production</div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-cyan-600" />
                        <span>{new Date(product.targetProductionDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Product Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.unit && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Unit</div>
                      <div>{product.unit}</div>
                    </div>
                  )}
                  
                  {product.minOrder && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Min Order</div>
                      <div>{product.minOrder}</div>
                    </div>
                  )}
                  
                  {product.price && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Price</div>
                      <div>{formatIDR(product.price)}</div>
                    </div>
                  )}
                  
                  {product.costEstimate && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Cost Estimate</div>
                      <div>{formatIDR(product.costEstimate)}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Status Information */}
              {product.orderReference && (
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                  <h3 className="font-medium text-cyan-800 mb-2 flex items-center gap-2">
                    <Beaker className="w-4 h-4" />
                    Production Status
                  </h3>
                  <p className="text-cyan-700 text-sm">
                    This R&D product is being tracked in the production system.
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-cyan-800">Order Reference:</span>
                    <span className="ml-2 text-cyan-700">#{product.orderReference.slice(0, 8)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Notes */}
          {product.notes && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                Development Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{product.notes}</p>
            </div>
          )}
          
          {/* Recipe Information */}
          {recipe && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-600" />
                Recipe Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Yield</div>
                    <div className="font-medium">{recipe.yield} {recipe.yieldUnit}</div>
                  </div>
                  
                  {(recipe.laborCost || recipe.packagingCost) && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Costs</div>
                      <div className="font-medium">
                        {recipe.laborCost && <div>Labor: {formatIDR(recipe.laborCost)}</div>}
                        {recipe.packagingCost && <div>Packaging: {formatIDR(recipe.packagingCost)}</div>}
                      </div>
                    </div>
                  )}
                </div>
                
                {recipe.ingredients.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Ingredients</div>
                    <div className="divide-y border rounded-md">
                      {recipe.ingredients.map((item, idx) => {
                        const ingredient = ingredients.find(i => i.id === item.ingredientId);
                        if (!ingredient) return null;
                        return (
                          <div key={idx} className="flex justify-between px-3 py-2 text-sm">
                            <div>{ingredient.name}</div>
                            <div>{item.amount} {ingredient.unit}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Product Excel
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            <FileDown className="w-4 h-4" />
            Product PDF
          </button>
          
          {recipe && (
            <button
              onClick={handleDownloadRecipe}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:opacity-90 shadow-md"
            >
              <FileDown className="w-4 h-4" />
              <span className="font-medium">Recipe PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}