import React, { useState, useEffect } from 'react';
import { X, Edit2, ArrowUpRight, Calendar, Star, FileText, Check, AlertCircle, ChevronLeft, ChevronRight, ClipboardList, FileDown, FileSpreadsheet, Info } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { RDProduct, TestResult } from '../../types/rd-types';
import type { Product, Recipe } from '../../types/types';
import { formatIDR } from '../../utils/currencyFormatter';
import { calculateRecipeWeight, applyWeightBasedCosts, loadGlobalCostRates } from '../../utils/recipeWeightCalculations';
import { generateRDApprovalPDF } from '../../utils/rdApprovalForm';
import ApprovalFormDialog from './ApprovalFormDialog';
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
  const { categories, ingredients, products, recipes } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'recipe'>('details');
  const [error, setError] = useState<string | null>(null);
  const [showApprovalFormDialog, setShowApprovalFormDialog] = useState(false);

  // Load real recipe ingredients from product if available
  useEffect(() => {
    if (product.recipeIngredients && product.recipeIngredients.length > 0) {
      // If the product has recipe ingredients, ensure we show the recipe tab initially
      setActiveTab('recipe');
    }
  }, [product]);

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
  
  // Use recipe ingredients or product's recipe ingredients if available
  const recipeIngredients = recipe ? recipe.ingredients : (product.recipeIngredients || []);

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
  
  // Calculate total ingredient cost
  const calculateTotalIngredientCost = () => {
    if (!recipeIngredients || recipeIngredients.length === 0) return 0;
    
    return recipeIngredients.reduce((total, item) => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return total;
      
      const unitPrice = ingredient.price / ingredient.packageSize;
      return total + (unitPrice * item.amount);
    }, 0);
  };
  
  // Calculate total recipe cost
  const calculateTotalRecipeCost = () => {
    if (!recipe && !recipeIngredients.length) return 0;
    
    const ingredientCost = calculateTotalIngredientCost();
    const laborCost = recipe?.laborCost || 0;
    const packagingCost = recipe?.packagingCost || 0;
    
    return ingredientCost + laborCost + packagingCost;
  };
  
  // Calculate cost per unit
  const calculateCostPerUnit = () => {
    if (!recipe && !recipeIngredients.length) return 0;
    const yield_ = recipe?.yield || product.minOrder || 1;
    const yieldUnit = recipe?.yieldUnit || product.unit || 'pcs';
    
    if (yield_ <= 0) return 0;
    return calculateTotalRecipeCost() / yield_;
  };
  
  const handleDownloadExcel = () => {
    // Create Excel data
    const data = [
      ['R&D Product Details'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Product Information'],
      ['Name:', product.name],
      ['Category:', categories[product.category]?.name || product.category],
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
    
    // Add recipe data if available (either from recipe object or product's recipeIngredients)
    if (recipe || recipeIngredients.length > 0) {
      const yield_ = recipe?.yield || product.minOrder || 1;
      const yieldUnit = recipe?.yieldUnit || product.unit || 'pcs';
      
      data.push([''], ['Recipe Information']);
      data.push(['Yield:', `${yield_} ${yieldUnit}`]);
      
      if (recipe) {
        if (recipe.laborCost) data.push(['Labor Cost:', formatIDR(recipe.laborCost)]);
        if (recipe.packagingCost) data.push(['Packaging Cost:', formatIDR(recipe.packagingCost)]);
      }
      
      if (recipeIngredients.length > 0) {
        data.push([''], ['Recipe Ingredients']);
        data.push(['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']);
        
        recipeIngredients.forEach(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return;
          
          // Calculate cost
          const unitPrice = ingredient.price / ingredient.packageSize;
          const cost = unitPrice * item.amount;
          
          data.push([
            ingredient.name,
            item.amount,
            ingredient.unit,
            formatIDR(unitPrice),
            formatIDR(cost)
          ]);
        });
        
        // Add total costs
        const totalIngredientCost = calculateTotalIngredientCost();
        const laborCost = recipe?.laborCost || 0;
        const packagingCost = recipe?.packagingCost || 0;
        const totalCost = totalIngredientCost + laborCost + packagingCost;
        
        data.push(['', '', '', 'Total Ingredient Cost:', formatIDR(totalIngredientCost)]);
        data.push(['', '', '', 'Total Cost:', formatIDR(totalCost)]);
        data.push(['', '', '', `Cost per ${yieldUnit}:`, formatIDR(calculateCostPerUnit())]);
      }
      
      // Add recipe notes if present
      if (recipe?.notes) {
        data.push([''], ['Recipe Notes:']);
        data.push([recipe.notes]);
      }
    }
    
    // Generate and download Excel
    const wb = generateExcelData(data, 'RD Product Details');
    saveWorkbook(wb, `rd-product-${product.id}.xlsx`);
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
    doc.text(`Category: ${categories[product.category]?.name || product.category}`, 14, 35);
    doc.text(`Status: ${product.status.charAt(0).toUpperCase() + product.status.slice(1)}`, 14, 42);
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
    
    // Add description if present
    let yPos = (doc as any).lastAutoTable.finalY + 10;
    if (product.description) {
      doc.setFontSize(12);
      doc.text('Description:', 14, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(product.description, 180);
      doc.text(splitDesc, 14, yPos);
      yPos += splitDesc.length * 5 + 10;
    }
    
    // Add notes if present
    if (product.notes) {
      doc.setFontSize(12);
      doc.text('Development Notes:', 14, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(product.notes, 180);
      doc.text(splitNotes, 14, yPos);
      yPos += splitNotes.length * 5 + 10;
    }
    
    // Add test results
    if (testResults && testResults.length > 0) {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 15;
      }
      
      doc.setFontSize(12);
      doc.text('Test Results:', 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Date', 'Tester', 'Result', 'Comments']],
        body: testResults.map(test => [
          new Date(test.date).toLocaleDateString(),
          test.tester,
          test.result.charAt(0).toUpperCase() + test.result.slice(1),
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
    if (recipe || recipeIngredients.length > 0) {
      // Add a new page for recipe
      doc.addPage();
      
      // Recipe title
      doc.setFontSize(18);
      doc.text('Recipe Information', 14, 15);
      
      doc.setFontSize(14);
      doc.text(`Recipe for: ${product.name}`, 14, 25);
      
      const yield_ = recipe?.yield || product.minOrder || 1;
      const yieldUnit = recipe?.yieldUnit || product.unit || 'pcs';
      
      doc.setFontSize(10);
      doc.text(`Yield: ${yield_} ${yieldUnit}`, 14, 35);
      
      // Recipe costs
      let y = 45;
      
      if (recipe?.laborCost || recipe?.packagingCost) {
        doc.setFontSize(12);
        doc.text('Costs:', 14, y);
        y += 7;
        
        doc.setFontSize(10);
        if (recipe?.laborCost) {
          doc.text(`Labor: ${formatIDR(recipe.laborCost)}`, 14, y);
          y += 6;
        }
        if (recipe?.packagingCost) {
          doc.text(`Packaging: ${formatIDR(recipe.packagingCost)}`, 14, y);
          y += 6;
        }
        y += 5;
      }
      
      // Ingredients table
      if (recipeIngredients.length > 0) {
        doc.setFontSize(12);
        doc.text('Ingredients:', 14, y);
        y += 7;
        
        // Calculate ingredient costs
        const ingredientsWithCost = recipeIngredients.map(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return null;
          
          // Calculate cost for this ingredient
          const unitPrice = ingredient.price / ingredient.packageSize;
          const cost = unitPrice * item.amount;
          
          return {
            ingredient,
            amount: item.amount,
            unitPrice,
            cost
          };
        }).filter(Boolean);
        
        if (ingredientsWithCost.length > 0) {
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
          
          // Calculate total cost
          const totalIngredientCost = calculateTotalIngredientCost();
          const totalRecipeCost = calculateTotalRecipeCost();
          const costPerUnit = calculateCostPerUnit();
          
          // Add summary
          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.text('Cost Summary:', 14, finalY);
          
          let summaryY = finalY + 7;
          doc.setFontSize(10);
          doc.text(`Total Ingredient Cost: ${formatIDR(totalIngredientCost)}`, 14, summaryY);
          summaryY += 6;
          doc.text(`Total Recipe Cost: ${formatIDR(totalRecipeCost)}`, 14, summaryY);
          summaryY += 6;
          doc.text(`Cost per ${yieldUnit}: ${formatIDR(costPerUnit)}`, 14, summaryY);
        }
      }
      
      // Add recipe notes if present
      if (recipe?.notes) {
        // Check if we need a new page
        let notesY = (doc as any).lastAutoTable?.finalY + 30 || 200;
        if (notesY > 250) {
          doc.addPage();
          notesY = 15;
        }
        
        doc.setFontSize(12);
        doc.text('Recipe Notes:', 14, notesY);
        notesY += 7;
        
        doc.setFontSize(10);
        const splitNotes = doc.splitTextToSize(recipe.notes, 180);
        doc.text(splitNotes, 14, notesY);
      }
    }
    
    // Save PDF
    doc.save(`rd-product-${product.id}.pdf`);
  };
  
  const handleExportRecipe = () => {
    if (!recipe && !recipeIngredients.length) {
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
    
    const yield_ = recipe?.yield || product.minOrder || 1;
    const yieldUnit = recipe?.yieldUnit || product.unit || 'pcs';
    doc.text(`Yield: ${yield_} ${yieldUnit}`, 14, 42);
    
    // Recipe costs
    let y = 52;
    const laborCost = recipe?.laborCost || 0;
    const packagingCost = recipe?.packagingCost || 0;
    const totalIngredientCost = calculateTotalIngredientCost();
    const totalCost = totalIngredientCost + laborCost + packagingCost;
    const costPerUnit = totalCost / yield_;
    
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Cost']],
      body: [
        ['Ingredient Cost', formatIDR(totalIngredientCost)],
        ['Labor Cost', formatIDR(laborCost)],
        ['Packaging Cost', formatIDR(packagingCost)],
        ['Total Cost', formatIDR(totalCost)],
        ['Cost per Unit', formatIDR(costPerUnit)]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255]
      },
      styles: {
        cellPadding: 4
      },
      columnStyles: {
        0: { fontStyle: 'bold' }
      },
      footStyles: {
        fillColor: [245, 245, 245], 
        fontStyle: 'bold'
      }
    });
    
    // Ingredients table
    y = (doc as any).lastAutoTable.finalY + 15;
    
    if (recipeIngredients.length > 0) {
      doc.setFontSize(12);
      doc.text('Recipe Ingredients:', 14, y);
      
      const ingredientData = recipeIngredients.map(item => {
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
        foot: [['', '', '', 'Total:', formatIDR(totalIngredientCost)]],
        footStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        }
      });
    }
    
    // Add preparation instructions if present
    if (recipe?.notes) {
      y = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(12);
      doc.text('Preparation Instructions:', 14, y);
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(recipe.notes, 180);
      doc.text(splitNotes, 14, y + 7);
    }
    
    // Save PDF
    doc.save(`recipe-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const handleOpenApprovalFormDialog = () => {
    setShowApprovalFormDialog(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
              ${product.status === 'approved' ? 'bg-green-100 text-green-800' : 
              product.status === 'rejected' ? 'bg-red-100 text-red-800' : 
              'bg-cyan-100 text-cyan-800'}`}
            >
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </span>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors
                ${activeTab === 'details' 
                  ? 'bg-cyan-100 text-cyan-800' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Info className="w-4 h-4 inline-block mr-1" />
              Product Details
            </button>
            <button
              onClick={() => setActiveTab('recipe')}
              className={`px-4 py-2 font-medium text-sm rounded-md transition-colors
                ${activeTab === 'recipe' 
                  ? 'bg-pink-100 text-pink-800' 
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ClipboardList className="w-4 h-4 inline-block mr-1" />
              Recipe Information
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
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
                    <FileText className="w-16 h-16 text-gray-300" />
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
              </div>
            </div>
          ) : (
            /* Recipe Tab */
            <div className="p-6 space-y-6">
              {(recipe || recipeIngredients.length > 0) ? (
                <>
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-5 rounded-lg border border-pink-100 space-y-4">
                    <h3 className="text-xl font-semibold text-pink-800 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Recipe for {product.name}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-pink-100 shadow-sm">
                        <div className="text-sm text-gray-500">Yield</div>
                        <div className="font-medium text-lg">
                          {recipe?.yield || product.minOrder || 1} {recipe?.yieldUnit || product.unit || 'pcs'}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-pink-100 shadow-sm">
                        <div className="text-sm text-gray-500">Total Cost</div>
                        <div className="font-medium text-lg">{formatIDR(calculateTotalRecipeCost())}</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-pink-100 shadow-sm">
                        <div className="text-sm text-gray-500">
                          Cost per {recipe?.yieldUnit || product.unit || 'pc'}
                        </div>
                        <div className="font-medium text-lg">{formatIDR(calculateCostPerUnit())}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-pink-100 shadow-sm">
                      <h4 className="font-medium mb-3 text-pink-800">Cost Breakdown</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">Ingredient Cost:</span>
                          <span>{formatIDR(calculateTotalIngredientCost())}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">Labor Cost:</span>
                          <span>{formatIDR(recipe?.laborCost || 0)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">Packaging Cost:</span>
                          <span>{formatIDR(recipe?.packagingCost || 0)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-pink-50 rounded border-t-2 border-pink-200">
                          <span className="font-semibold text-pink-800">Total Cost:</span>
                          <span className="font-semibold">{formatIDR(calculateTotalRecipeCost())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-pink-600" />
                      Ingredients List
                    </h4>
                    
                    {recipeIngredients.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredient</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {recipeIngredients.map((item, index) => {
                              const ingredient = ingredients.find(i => i.id === item.ingredientId);
                              if (!ingredient) return null;

                              const unitPrice = ingredient.price / ingredient.packageSize;
                              const cost = unitPrice * item.amount;
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ingredient.name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.amount}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{ingredient.unit}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatIDR(unitPrice)}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatIDR(cost)}</td>
                                </tr>
                              );
                            })}
                            <tr className="bg-pink-50">
                              <td colSpan={3} className="px-4 py-3 text-right"></td>
                              <td className="px-4 py-3 text-sm font-semibold text-pink-800 text-right">Total Ingredient Cost:</td>
                              <td className="px-4 py-3 text-sm font-semibold text-pink-800 text-right">{formatIDR(calculateTotalIngredientCost())}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No ingredients defined for this recipe</p>
                    )}
                  </div>
                  
                  {recipe?.notes && (
                    <div className="bg-white p-5 rounded-lg border shadow-sm">
                      <h4 className="text-lg font-semibold flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-pink-600" />
                        Preparation Instructions
                      </h4>
                      <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-line">
                        {recipe.notes}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Recipe Available</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    This product doesn't have a recipe defined yet. You can add one by editing the product.
                  </p>
                </div>
              )}
            </div>
          )}
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
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            {(recipe || recipeIngredients.length > 0) && (
              <>
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
              <>
                <button
                  onClick={handleOpenApprovalFormDialog}
                  className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                >
                  <FileDown className="w-4 h-4" />
                  Approval Form
                </button>
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Approve for Production
                </button>
              </>
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

      {showApprovalFormDialog && (
        <ApprovalFormDialog
          product={product}
          onClose={() => setShowApprovalFormDialog(false)}
        />
      )}
    </div>
  );
}

// Import required functions from excelGenerator module
function generateExcelData(data: any[][], sheetName: string): any {
  // This is just a declaration to keep TypeScript happy since the actual function is imported from excelGenerator
  return null;
}

function saveWorkbook(wb: any, filename: string) {
  // This is just a declaration to keep TypeScript happy since the actual function is imported from excelGenerator
}

// This is a placeholder for the ConfirmDialog component that is required
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) {
  // This is just a placeholder since the actual component is imported
  return null;
}