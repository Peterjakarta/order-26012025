import React, { useState } from 'react';
import { X, Edit2, ArrowUpRight, Calendar, Star, FileText, Check, AlertCircle, ChevronLeft, ChevronRight, ClipboardList, FileDown, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDProduct, TestResult } from '../../types/rd-types';
import ConfirmDialog from '../common/ConfirmDialog';
import Beaker from '../common/BeakerIcon';
import { generateExcelData, saveWorkbook } from '../../utils/excelGenerator';
import { formatIDR } from '../../utils/currencyFormatter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { categories, recipes, ingredients } = useStore();
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

  // Find related recipe (if exists)
  const recipe = recipes.find(r => r.productId === product.id);

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
  
  const handleExportExcel = () => {
    // Create Excel data
    const data = [
      ['R&D Product Details'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Product Information'],
      ['Name:', product.name],
      ['Category:', categories[product.category]?.name || product.category],
      ['Status:', product.status],
      ['Development Date:', new Date(product.developmentDate).toLocaleDateString()],
      ['Target Production Date:', product.targetProductionDate ? new Date(product.targetProductionDate).toLocaleDateString() : 'Not set'],
      [''],
      ['Cost & Pricing'],
      ['Unit:', product.unit || ''],
      ['Price:', product.price ? formatIDR(product.price) : 'N/A'],
      ['Min Order:', product.minOrder || 'N/A'],
      ['Cost Estimate:', product.costEstimate ? formatIDR(product.costEstimate) : 'N/A'],
      [''],
      ['Notes:', product.notes || '']
    ];

    // Add test results if available
    if (testResults && testResults.length > 0) {
      data.push([''], ['Test Results']);
      data.push(['Date', 'Tester', 'Result', 'Comments']);
      
      testResults.forEach(test => {
        data.push([
          new Date(test.date).toLocaleDateString(),
          test.tester,
          test.result,
          test.comments
        ]);
      });
    }
    
    // Add recipe data if available
    if (recipe) {
      data.push([''], ['Recipe Information']);
      data.push(['Yield:', `${recipe.yield} ${recipe.yieldUnit}`]);
      if (recipe.laborCost) data.push(['Labor Cost:', formatIDR(recipe.laborCost)]);
      if (recipe.packagingCost) data.push(['Packaging Cost:', formatIDR(recipe.packagingCost)]);
      
      if (recipe.ingredients.length > 0) {
        data.push([''], ['Recipe Ingredients']);
        data.push(['Ingredient', 'Amount', 'Unit', 'Cost']);
        
        recipe.ingredients.forEach(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return;
          
          // Calculate cost
          const unitPrice = ingredient.price / ingredient.packageSize;
          const cost = unitPrice * item.amount;
          
          data.push([
            ingredient.name,
            item.amount,
            ingredient.unit,
            formatIDR(cost)
          ]);
        });
        
        // Calculate total cost
        const totalIngredientCost = recipe.ingredients.reduce((total, item) => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return total;
          
          const unitPrice = ingredient.price / ingredient.packageSize;
          return total + (unitPrice * item.amount);
        }, 0);
        
        data.push(['', '', 'Total Ingredient Cost:', formatIDR(totalIngredientCost)]);
      }
    }
    
    // Generate and download Excel
    const wb = generateExcelData(data, 'RD Product Details');
    saveWorkbook(wb, `rd-product-${product.id}.xlsx`);
  };
  
  const handleExportPDF = () => {
    // Create PDF document
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('R&D Product Details', 14, 15);
    
    // Basic product info
    doc.setFontSize(14);
    doc.text(product.name, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Category: ${categories[product.category]?.name || product.category}`, 14, 35);
    doc.text(`Status: ${product.status}`, 14, 42);
    doc.text(`Development Date: ${new Date(product.developmentDate).toLocaleDateString()}`, 14, 49);
    
    if (product.targetProductionDate) {
      doc.text(`Target Production Date: ${new Date(product.targetProductionDate).toLocaleDateString()}`, 14, 56);
    }
    
    // Cost table
    autoTable(doc, {
      startY: 65,
      head: [['Unit', 'Price', 'Min Order', 'Cost Estimate']],
      body: [
        [
          product.unit || 'N/A', 
          product.price ? formatIDR(product.price) : 'N/A', 
          product.minOrder?.toString() || 'N/A', 
          product.costEstimate ? formatIDR(product.costEstimate) : 'N/A'
        ]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [0, 183, 183],
        textColor: [255, 255, 255]
      }
    });
    
    // Add notes if present
    if (product.notes) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text('Development Notes:', 14, finalY);
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(product.notes, 180);
      doc.text(splitNotes, 14, finalY + 7);
    }
    
    // Add test results
    if (testResults && testResults.length > 0) {
      let startY = (doc as any).lastAutoTable?.finalY + 30 || 120;
      
      doc.setFontSize(12);
      doc.text('Test Results:', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Date', 'Tester', 'Result', 'Comments']],
        body: testResults.map(test => [
          new Date(test.date).toLocaleDateString(),
          test.tester,
          test.result,
          test.comments
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [0, 183, 183],
          textColor: [255, 255, 255]
        }
      });
    }
    
    // Add recipe information if available
    if (recipe) {
      // Add a new page for recipe
      doc.addPage();
      
      // Recipe title
      doc.setFontSize(18);
      doc.text('Recipe Information', 14, 15);
      
      doc.setFontSize(14);
      doc.text(`Recipe for: ${product.name}`, 14, 25);
      
      doc.setFontSize(10);
      doc.text(`Yield: ${recipe.yield} ${recipe.yieldUnit}`, 14, 35);
      
      // Recipe costs
      let y = 45;
      
      if (recipe.laborCost || recipe.packagingCost) {
        doc.setFontSize(12);
        doc.text('Costs:', 14, y);
        y += 7;
        
        doc.setFontSize(10);
        if (recipe.laborCost) {
          doc.text(`Labor: ${formatIDR(recipe.laborCost)}`, 14, y);
          y += 6;
        }
        if (recipe.packagingCost) {
          doc.text(`Packaging: ${formatIDR(recipe.packagingCost)}`, 14, y);
          y += 6;
        }
        y += 5;
      }
      
      // Ingredients table
      if (recipe.ingredients.length > 0) {
        doc.setFontSize(12);
        doc.text('Ingredients:', 14, y);
        y += 7;
        
        // Calculate ingredient costs
        const ingredientsWithCost = recipe.ingredients.map(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return null;
          
          const unitPrice = ingredient.price / ingredient.packageSize;
          const cost = unitPrice * item.amount;
          
          return {
            ingredient,
            amount: item.amount,
            unitPrice,
            cost
          };
        }).filter(Boolean);
        
        autoTable(doc, {
          startY: y,
          head: [['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']],
          body: ingredientsWithCost.map(item => [
            item!.ingredient.name,
            item!.amount.toString(),
            item!.ingredient.unit,
            formatIDR(item!.unitPrice),
            formatIDR(item!.cost)
          ]),
          theme: 'striped',
          headStyles: {
            fillColor: [236, 72, 153],
            textColor: [255, 255, 255]
          }
        });
        
        // Calculate total ingredient cost
        const totalIngredientCost = ingredientsWithCost.reduce((total, item) => total + item!.cost, 0);
        
        // Add summary
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text(`Total Ingredient Cost: ${formatIDR(totalIngredientCost)}`, 14, finalY);
      }
    }
    
    // Save PDF
    doc.save(`rd-product-${product.id}.pdf`);
  };
  
  const handleExportRecipe = () => {
    if (!recipe) {
      alert('No recipe information available for this product');
      return;
    }
    
    // Create PDF document focused only on the recipe
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Recipe Information', 14, 15);
    
    doc.setFontSize(14);
    doc.text(`${product.name}`, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Category: ${categories[product.category]?.name || product.category}`, 14, 35);
    doc.text(`Yield: ${recipe.yield} ${recipe.yieldUnit}`, 14, 42);
    
    // Recipe costs
    let y = 52;
    const totalCost = (recipe.laborCost || 0) + (recipe.packagingCost || 0);
    
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Cost']],
      body: [
        ['Labor Cost', formatIDR(recipe.laborCost || 0)],
        ['Packaging Cost', formatIDR(recipe.packagingCost || 0)],
        ['Total Cost', formatIDR(totalCost)],
        ['Cost per Unit', formatIDR(totalCost / recipe.yield)]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255]
      }
    });
    
    // Ingredients table
    y = (doc as any).lastAutoTable.finalY + 15;
    
    if (recipe.ingredients.length > 0) {
      doc.setFontSize(12);
      doc.text('Recipe Ingredients:', 14, y);
      
      const ingredientData = recipe.ingredients.map(item => {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        if (!ingredient) return null;
        
        const unitPrice = ingredient.price / ingredient.packageSize;
        const cost = unitPrice * item.amount;
        
        return [
          ingredient.name,
          item.amount.toString(),
          ingredient.unit,
          formatIDR(unitPrice),
          formatIDR(cost)
        ];
      }).filter(Boolean);
      
      autoTable(doc, {
        startY: y + 7,
        head: [['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']],
        body: ingredientData,
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: [255, 255, 255]
        },
        foot: [['', '', '', 'Total:', formatIDR(
          recipe.ingredients.reduce((sum, item) => {
            const ingredient = ingredients.find(i => i.id === item.ingredientId);
            if (!ingredient) return sum;
            const unitPrice = ingredient.price / ingredient.packageSize;
            return sum + (unitPrice * item.amount);
          }, 0)
        )]],
        footStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        }
      });
    }
    
    // Add recipe notes if present
    if (recipe.notes) {
      y = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.text('Recipe Notes:', 14, y);
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(recipe.notes, 180);
      doc.text(splitNotes, 14, y + 7);
    }
    
    // Save PDF
    doc.save(`recipe-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };
  
  const handleExportRecipeExcel = () => {
    if (!recipe) {
      alert('No recipe information available for this product');
      return;
    }
    
    // Create Excel data focused on the recipe
    const data = [
      ['Recipe Information'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Product:', product.name],
      ['Category:', categories[product.category]?.name || product.category],
      ['Yield:', `${recipe.yield} ${recipe.yieldUnit}`],
      [''],
      ['Costs'],
      ['Labor Cost:', formatIDR(recipe.laborCost || 0)],
      ['Packaging Cost:', formatIDR(recipe.packagingCost || 0)],
      ['Total Cost:', formatIDR((recipe.laborCost || 0) + (recipe.packagingCost || 0))],
      ['Cost per Unit:', formatIDR(((recipe.laborCost || 0) + (recipe.packagingCost || 0)) / recipe.yield)],
      [''],
      ['Recipe Ingredients'],
      ['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']
    ];
    
    // Add ingredient rows
    let totalIngredientCost = 0;
    recipe.ingredients.forEach(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return;
      
      const unitPrice = ingredient.price / ingredient.packageSize;
      const cost = unitPrice * item.amount;
      totalIngredientCost += cost;
      
      data.push([
        ingredient.name,
        item.amount,
        ingredient.unit,
        formatIDR(unitPrice),
        formatIDR(cost)
      ]);
    });
    
    // Add total ingredient cost
    data.push(['', '', '', 'Total Ingredient Cost:', formatIDR(totalIngredientCost)]);
    
    // Add recipe notes if present
    if (recipe.notes) {
      data.push([''], ['Recipe Notes:'], [recipe.notes]);
    }
    
    // Generate and download Excel
    const wb = generateExcelData(data, 'Recipe Details');
    saveWorkbook(wb, `recipe-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
              ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
              product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
              'bg-cyan-100 text-cyan-800'}`}
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
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
                  <div className="font-medium">{product.price ? formatIDR(product.price) : 'N/A'}</div>
                </div>
                
                {product.costEstimate && (
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <div className="text-sm text-gray-500">Cost Estimate</div>
                    <div className="font-medium">{formatIDR(product.costEstimate)}</div>
                  </div>
                )}
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
              
              {/* Recipe Information Section */}
              {recipe && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-cyan-600" />
                    Recipe Information
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Yield</div>
                        <div className="font-medium">{recipe.yield} {recipe.yieldUnit}</div>
                      </div>
                      
                      {(recipe.laborCost || recipe.packagingCost) && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Additional Costs</div>
                          {recipe.laborCost && (
                            <div className="font-medium">Labor: {formatIDR(recipe.laborCost)}</div>
                          )}
                          {recipe.packagingCost && (
                            <div className="font-medium">Packaging: {formatIDR(recipe.packagingCost)}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {recipe.ingredients.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-500 mb-2">Ingredients</div>
                        <div className="divide-y border rounded-lg">
                          {recipe.ingredients.map((item, index) => {
                            const ingredient = ingredients.find(i => i.id === item.ingredientId);
                            if (!ingredient) return null;
                            
                            return (
                              <div key={index} className="flex justify-between p-2 text-sm">
                                <span>{ingredient.name}</span>
                                <span>{item.amount} {ingredient.unit}</span>
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
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            {recipe && (
              <>
                <button
                  onClick={handleExportRecipeExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Recipe Excel
                </button>
                <button
                  onClick={handleExportRecipe}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                >
                  <FileDown className="w-4 h-4" />
                  Recipe PDF
                </button>
              </>
            )}
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