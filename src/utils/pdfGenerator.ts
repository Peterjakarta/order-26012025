import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, Product, Recipe, Ingredient } from '../types/types';
import { getBranchName } from '../data/branches';
import { calculateMouldCount } from './mouldCalculations';
import { calculateExpiryDate } from './dateUtils';
import { calculateRecipeCost, calculateSellPrice, calculateTotalProductionCost } from './recipeCalculations';
import { isBonBonCategory, isPralinesCategory } from './quantityUtils';
import { formatIDR } from './currencyFormatter';
import { ExportOptions } from '../components/management/pricing/ExportOptionsDialog';

export function generateOrderWithRecipesPDF(order: Order, products: Product[], recipes: Recipe[], ingredients: Ingredient[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const branchName = getBranchName(order.branchId);
  let yPos = 15;

  // Header
  doc.setFontSize(16);
  doc.text('Production Order with Recipes', 14, yPos);
  yPos += 10;

  // Order details
  doc.setFontSize(10);
  doc.text(`Order #: ${order.id.slice(0, 8)}`, 14, yPos);
  doc.text(`Branch: ${branchName}`, 14, yPos + 6);
  doc.text(`Production: ${new Date(order.productionStartDate!).toLocaleDateString()} - ${new Date(order.productionEndDate!).toLocaleDateString()}`, 14, yPos + 12);
  yPos += 20;

  // Products and their recipes
  for (const item of order.products) {
    const product = products.find(p => p.id === item.productId);
    const recipe = recipes.find(r => r.productId === item.productId);
    if (!product) continue;

    // Add page break if needed
    if (yPos > 250) {
      doc.addPage();
      yPos = 15;
    }

    // Product header
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(product.name, 14, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Quantity: ${item.quantity} ${product.unit}`, 14, yPos);
    yPos += 6;

    if (recipe) {
      // Recipe details
      doc.text('Recipe:', 14, yPos);
      yPos += 6;

      // Ingredients table
      const tableData = recipe.ingredients.map(ingredient => {
        const ingredientData = ingredients.find(i => i.id === ingredient.ingredientId);
        if (!ingredientData) return [];

        const scaledAmount = Math.ceil((ingredient.amount / recipe.yield) * item.quantity);
        return [
          ingredientData.name,
          scaledAmount.toString(),
          ingredientData.unit
        ];
      }).filter(row => row.length > 0);

      if (tableData.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Ingredient', 'Amount', 'Unit']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [236, 72, 153],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 2
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Add recipe notes if any
      if (recipe.notes) {
        doc.text('Notes:', 14, yPos);
        yPos += 5;
        const splitNotes = doc.splitTextToSize(recipe.notes, 180);
        doc.text(splitNotes, 14, yPos);
        yPos += splitNotes.length * 5 + 5;
      }
    } else {
      doc.text('No recipe available', 14, yPos);
      yPos += 10;
    }

    yPos += 5; // Space between products
  }

  return doc;
}

interface StockChecklistCategory {
  categoryName: string;
  ingredients: {
    name: string;
    currentStock: number;
    unit: string;
    minStock?: number;
    packageSize: number;
    packageUnit: string;
  }[];
}

export function generateStockChecklistPDF(categories: StockChecklistCategory[]) {
  // Create PDF document in portrait mode
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set initial position
  let yPos = 15;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  const columnWidth = (pageWidth - (margin * 2)) / 2;

  // Add title and date
  doc.setFontSize(16);
  doc.text('Stock Count Checklist', margin, yPos);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, yPos);
  yPos += 10;

  // Process each category
  categories.forEach((category, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 15;
    }

    // Add category header
    doc.setFillColor(236, 72, 153); // Pink color
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F');
    doc.text(category.categoryName, margin + 2, yPos + 5);
    yPos += 10;

    // Add table headers
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Ingredient', margin, yPos);
    doc.text('Current Stock', margin + (columnWidth * 0.8), yPos);
    doc.text('Count', margin + (columnWidth * 1.6), yPos);
    yPos += 5;

    // Add ingredients
    category.ingredients.forEach(ingredient => {
      // Check if we need a new page
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = 15;
        
        // Repeat headers on new page
        doc.setFillColor(236, 72, 153);
        doc.setTextColor(255, 255, 255);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 7, 'F');
        doc.text(`${category.categoryName} (continued)`, margin + 2, yPos + 5);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.text('Ingredient', margin, yPos);
        doc.text('Current Stock', margin + (columnWidth * 0.8), yPos);
        doc.text('Count', margin + (columnWidth * 1.6), yPos);
        yPos += 5;
      }

      // Add ingredient row
      doc.text(ingredient.name, margin, yPos);
      doc.text(
        `${ingredient.currentStock} ${ingredient.unit}`, 
        margin + (columnWidth * 0.8), 
        yPos
      );

      // Add count box
      doc.rect(
        margin + (columnWidth * 1.6), 
        yPos - 4, 
        40, 
        6
      );

      // Add min stock warning if applicable
      if (ingredient.minStock !== undefined) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Min: ${ingredient.minStock} ${ingredient.unit}`,
          margin + (columnWidth * 0.8) + 40,
          yPos
        );
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
      }

      yPos += 8;
    });

    // Add space between categories
    yPos += 5;
  });

  // Add notes section at the bottom of the last page
  const notesY = pageHeight - 40;
  doc.setFontSize(10);
  doc.text('Notes:', margin, notesY);
  doc.rect(margin, notesY + 2, pageWidth - (margin * 2), 30);

  return doc;
}

export function generateProductionChecklistPDF(order: Order, products: Product[]) {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Get branch name
  const branchName = getBranchName(order.branchId);

  // Header
  doc.setFontSize(16);
  doc.text('Production Checklist', 20, 15);

  doc.setFontSize(9);
  doc.text(`Order #: ${order.id.slice(0, 8)}`, 20, 25);
  doc.text(`Branch: ${branchName}`, 20, 30);
  doc.text(`Production Date: ${new Date().toLocaleDateString()}`, 20, 35);

  // Create table
  const tableData = order.products.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return [];

    const mouldInfo = calculateMouldCount(product.category, item.quantity);
    const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);

    return [
      product.name,
      `${item.quantity} ${product.unit || ''}`,
      showMould ? mouldInfo : '-',
      '', // Produced
      '', // Rejected
      '', // Spray
      '', // Ready
      '', // Shell
      '', // Ganache
      ''  // Closed
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [['Product', 'Ordered', 'Mould', 'Produced', 'Rejected', 'Spray', 'Ready', 'Shell', 'Ganache', 'Closed']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 27 },  // Product
      1: { cellWidth: 27 },  // Ordered
      2: { cellWidth: 27 },  // Mould
      3: { cellWidth: 27 },  // Produced  
      4: { cellWidth: 27 },  // Rejected
      5: { cellWidth: 27 },  // Spray
      6: { cellWidth: 27 },  // Ready
      7: { cellWidth: 27 },  // Shell
      8: { cellWidth: 27 },  // Ganache
      9: { cellWidth: 27 }   // Closed
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      minCellHeight: 6
    },
    margin: { left: 20, right: 20 }
  });

  return doc;
}

export function generateRecipePDF(
  recipe: Recipe, 
  ingredients: Ingredient[], 
  quantity: number = recipe.yield,
  options?: ExportOptions
) {
  // Default options if not provided
  const exportOptions = options || {
    includeCosts: true,
    includeOverheadCosts: true,
    includeIngredients: true,
    includeNotes: true,
    exportFormat: 'pdf'
  };

  // Create PDF document
  const doc = new jsPDF();
  
  // Calculate base cost (ingredients only)
  const baseCost = exportOptions.includeCosts ? calculateRecipeCost(recipe, ingredients) : 0;
  const scaledBaseCost = exportOptions.includeCosts ? (baseCost / recipe.yield) * quantity : 0;
  
  // Additional costs
  const laborCost = (exportOptions.includeCosts && exportOptions.includeOverheadCosts && recipe.laborCost) 
    ? (recipe.laborCost / recipe.yield) * quantity 
    : 0;
  
  const packagingCost = (exportOptions.includeCosts && exportOptions.includeOverheadCosts && recipe.packagingCost) 
    ? (recipe.packagingCost / recipe.yield) * quantity 
    : 0;
  
  const equipmentCost = (exportOptions.includeCosts && exportOptions.includeOverheadCosts && recipe.equipmentCost) 
    ? (recipe.equipmentCost / recipe.yield) * quantity 
    : 0;
  
  // Production cost (before reject adjustment)
  const productionCost = scaledBaseCost + laborCost + packagingCost + equipmentCost;
  
  // Reject cost (if applicable)
  const rejectPercentage = (exportOptions.includeCosts && exportOptions.includeOverheadCosts) ? (recipe.rejectPercentage || 0) : 0;
  const rejectCost = productionCost * (rejectPercentage / 100);
  
  // Total production cost with reject adjustment
  const totalProductionCost = productionCost + rejectCost;
  
  // Cost per unit
  const costPerUnit = quantity > 0 ? totalProductionCost / quantity : 0;
  
  // Selling price calculation
  const marginPercentage = (exportOptions.includeCosts && exportOptions.includeOverheadCosts) ? (recipe.marginPercentage || 30) : 0; // Default 30%
  const taxPercentage = (exportOptions.includeCosts && exportOptions.includeOverheadCosts) ? (recipe.taxPercentage || 10) : 0; // Default 10%
  
  // Calculate selling price without tax
  const baseSellingPrice = exportOptions.includeCosts ? calculateSellPrice(costPerUnit, marginPercentage, false) : 0;
  
  // Calculate selling price with tax
  const sellingPriceWithTax = exportOptions.includeCosts ? calculateSellPrice(costPerUnit, marginPercentage, true, taxPercentage) : 0;
  
  // Rounded selling price
  const roundedSellingPrice = Math.ceil(sellingPriceWithTax / 1000) * 1000;

  // Header
  doc.setFontSize(20);
  doc.text('Recipe Details', 14, 15);

  doc.setFontSize(12);
  doc.text(`Recipe: ${recipe.name}`, 14, 25);
  doc.text(`Quantity: ${quantity} ${recipe.yieldUnit}`, 14, 32);

  // Only include ingredients if specified
  if (exportOptions.includeIngredients) {
    // Ingredients table - use scaled amounts based on the provided quantity
    const tableData = recipe.ingredients.map(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return [];

      const scaledAmount = (item.amount / recipe.yield) * quantity;
      
      // Only include cost columns if costs are included
      if (exportOptions.includeCosts) {
        const unitPrice = ingredient.price / ingredient.packageSize;
        const cost = unitPrice * scaledAmount;
        
        return [
          ingredient.name,
          scaledAmount.toFixed(2),
          ingredient.unit,
          formatIDR(unitPrice),
          formatIDR(cost)
        ];
      } else {
        return [
          ingredient.name,
          scaledAmount.toFixed(2),
          ingredient.unit
        ];
      }
    }).filter(row => row.length > 0);

    // Define table headers based on options
    const tableHeaders = exportOptions.includeCosts 
      ? ['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']
      : ['Ingredient', 'Amount', 'Unit'];

    autoTable(doc, {
      startY: 40,
      head: [tableHeaders],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: exportOptions.includeCosts 
        ? {
            0: { cellWidth: 60 },  // Ingredient name
            1: { cellWidth: 30, halign: 'right' },  // Amount
            2: { cellWidth: 20 },  // Unit
            3: { cellWidth: 30, halign: 'right' },  // Unit Price
            4: { cellWidth: 30, halign: 'right' }   // Cost
          }
        : {
            0: { cellWidth: 80 },  // Ingredient name
            1: { cellWidth: 40, halign: 'right' },  // Amount
            2: { cellWidth: 40 }   // Unit
          }
    });

    // Add total weight if ingredients are included
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Calculate total weight
    const totalWeight = recipe.ingredients.reduce((total, item) => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return total;
      const scaledAmount = (item.amount / recipe.yield) * quantity;
      return total + scaledAmount;
    }, 0);
    
    // Get common unit (assuming all ingredients use the same unit)
    const commonUnit = recipe.ingredients.length > 0 && ingredients.find(i => i.id === recipe.ingredients[0].ingredientId)?.unit || '';
    
    if (commonUnit) {
      doc.text(`Total Weight: ${totalWeight.toFixed(2)} ${commonUnit}`, 14, finalY);
    }
  }

  // Only include costs if specified
  if (exportOptions.includeCosts) {
    // Production cost breakdown
    const costStartY = exportOptions.includeIngredients 
      ? (doc as any).lastAutoTable.finalY + 15 
      : 40;
      
    doc.setFontSize(14);
    doc.text('Production Costs:', 14, costStartY);
    
    const costData = [
      ['Base Ingredient Cost:', formatIDR(scaledBaseCost)]
    ];
    
    // Only include overhead costs if specified
    if (exportOptions.includeOverheadCosts) {
      costData.push(
        ['Labor Cost:', formatIDR(laborCost)],
        ['Packaging Cost:', formatIDR(packagingCost)],
        ['Equipment Cost:', formatIDR(equipmentCost)],
        [`Reject Cost (${rejectPercentage}%):`, formatIDR(rejectCost)]
      );
    }
    
    costData.push(
      ['Total Production Cost:', formatIDR(totalProductionCost)],
      [`Cost per ${recipe.yieldUnit}:`, formatIDR(costPerUnit)]
    );

    autoTable(doc, {
      startY: costStartY + 5,
      body: costData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' }
      }
    });

    // Pricing information
    const pricingY = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (pricingY > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Pricing:', 14, 20);
      
      const pricingData = [
        [`Margin (${marginPercentage}%):`, formatIDR(baseSellingPrice - costPerUnit)],
        ['Selling Price (before tax):', formatIDR(baseSellingPrice)],
        [`Tax (${taxPercentage}%):`, formatIDR(sellingPriceWithTax - baseSellingPrice)],
        ['Selling Price (with tax):', formatIDR(sellingPriceWithTax)],
        ['Rounded Selling Price:', formatIDR(roundedSellingPrice)]
      ];

      autoTable(doc, {
        startY: 25,
        body: pricingData,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'right' }
        }
      });
    } else {
      doc.setFontSize(14);
      doc.text('Pricing:', 14, pricingY);
      
      const pricingData = [
        [`Margin (${marginPercentage}%):`, formatIDR(baseSellingPrice - costPerUnit)],
        ['Selling Price (before tax):', formatIDR(baseSellingPrice)],
        [`Tax (${taxPercentage}%):`, formatIDR(sellingPriceWithTax - baseSellingPrice)],
        ['Selling Price (with tax):', formatIDR(sellingPriceWithTax)],
        ['Rounded Selling Price:', formatIDR(roundedSellingPrice)]
      ];

      autoTable(doc, {
        startY: pricingY + 5,
        body: pricingData,
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 60, halign: 'right' }
        }
      });
    }
  }

  // Only include notes if specified
  if (exportOptions.includeNotes && recipe.notes) {
    // Check if we need a new page
    const currentY = (doc as any).lastAutoTable?.finalY + 15 || 40;
    
    if (currentY > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Preparation Notes:', 14, 20);
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(recipe.notes, 180);
      doc.text(splitNotes, 14, 30);
    } else {
      doc.setFontSize(14);
      doc.text('Preparation Notes:', 14, currentY);
      
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(recipe.notes, 180);
      doc.text(splitNotes, 14, currentY + 10);
    }
  }

  return doc;
}

export function generateOrderPDF(order: Order, products: Product[], poNumber?: string) {
  // Create PDF in landscape mode
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Get branch name using helper function
  const branchName = getBranchName(order.branchId);

  // Header layout
  doc.setFontSize(16);
  doc.text('Order Details', 14, 15);

  doc.setFontSize(10);
  let y = 25;
  const leftCol = 14;
  const rightCol = 200; // Adjusted for landscape

  // Left column info
  doc.text(`Order #: ${order.id.slice(0, 8)}`, leftCol, y);
  doc.text(`Branch: ${branchName}`, leftCol, y + 6);
  if (order.poNumber || poNumber) {
    doc.text(`PO #: ${order.poNumber || poNumber}`, leftCol, y + 12);
    y += 6; // Adjust y position for additional line
  }
  
  // Right column info
  doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`, rightCol, y);
  if (order.completedAt) {
    doc.text(`Production Date: ${new Date(order.completedAt).toLocaleDateString()}`, rightCol, y + 6);
  }

  // Start table higher on the page
  const tableStartY = y + 20;

  // Add products table with optimized column widths for landscape mode
  const tableData = order.products.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return [];

    const mouldInfo = calculateMouldCount(product.category, item.quantity);
    const showMould = isBonBonCategory(product.category) || isPralinesCategory(product.category);
    const expiryDate = order.completedAt ? calculateExpiryDate(order.completedAt) : null;

    return [
      product.name,
      `${item.quantity} ${product.unit || ''}`,
      `${item.producedQuantity || 0} ${product.unit || ''}`,
      `${item.stockQuantity || 0} ${product.unit || ''}`,
      `${item.rejectQuantity || 0} ${product.unit || ''}`,
      item.rejectNotes || '-',
      order.completedAt ? new Date(order.completedAt).toLocaleDateString() : '-',
      expiryDate ? expiryDate.toLocaleDateString() : '-',
      showMould ? mouldInfo : '-'
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['Product', 'Ordered', 'Produced', 'Stock', 'Reject', 'Reject Notes', 'Production Date', 'Expiry Date', 'Mould']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 40 },  // Product name
      1: { cellWidth: 25 },  // Ordered
      2: { cellWidth: 25 },  // Produced
      3: { cellWidth: 25 },  // Stock
      4: { cellWidth: 25 },  // Reject
      5: { cellWidth: 40 },  // Reject Notes
      6: { cellWidth: 30 },  // Production Date
      7: { cellWidth: 30 },  // Expiry Date
      8: { cellWidth: 25 }   // Mould
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 2) {
          const row = data.row.index;
          const orderedQty = parseInt(tableData[row][1]);
          const producedQty = parseInt(tableData[row][2]);
          if (producedQty < orderedQty) {
            doc.setTextColor(201, 93, 0); // Orange for under-produced
          } else {
            doc.setTextColor(21, 128, 61); // Green for matched/exceeded
          }
        } else if (data.column.index === 4 || data.column.index === 5) {
          // Red color for reject quantities and notes
          const rejectQty = parseInt(tableData[data.row.index][4]);
          if (rejectQty > 0) {
            doc.setTextColor(220, 38, 38); // Red for rejects
          }
        } else {
          doc.setTextColor(0, 0, 0); // Reset to black
        }
      }
    }
  });

  // Add notes at the bottom if present
  if (order.notes) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY < doc.internal.pageSize.height - 20) { // Check if there's space
      doc.setFontSize(9);
      doc.text('Notes:', leftCol, finalY);
      doc.setFontSize(8);
      
      // Split notes into multiple lines if needed
      const maxWidth = doc.internal.pageSize.width - 28; // 14pt margin on each side
      const splitNotes = doc.splitTextToSize(order.notes, maxWidth);
      doc.text(splitNotes, leftCol, finalY + 5);
    }
  }

  return doc;
}

interface BranchSummary {
  branchName: string;
  completionDates: string[];
}

interface IngredientUsagePDFData {
  orders: Order[];
  branchSummary: BranchSummary[];
  products: {
    name: string;
    quantity: number;
    producedQuantity: number;
    unit: string;
    recipe?: Recipe;
  }[];
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    unitPrice: number;
    cost: number;
  }[];
  totalCost: number;
}

export function generateIngredientUsagePDF(data: IngredientUsagePDFData) {
  // Create PDF document
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Ingredient Usage Summary', 14, 15);

  // Branch Summary
  let yPos = 30;
  doc.setFontSize(12);
  doc.text('Branch Summary:', 14, yPos);
  yPos += 8;

  data.branchSummary.forEach(branch => {
    doc.setFontSize(11);
    doc.text(branch.branchName, 14, yPos);
    yPos += 5;
    doc.setFontSize(10);
    branch.completionDates.forEach(date => {
      doc.text(`Completed: ${new Date(date).toLocaleDateString()}`, 20, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  // Products table
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [['Product', 'Ordered', 'Produced', 'Unit']],
    body: data.products.map(product => [
      product.name,
      product.quantity.toString(),
      product.producedQuantity.toString(),
      product.unit
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 80 },  // Product name
      1: { cellWidth: 30, halign: 'right' },  // Ordered
      2: { cellWidth: 30, halign: 'right' },  // Produced
      3: { cellWidth: 30 }   // Unit
    }
  });

  // Ingredients table
  const ingredientsStartY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.text('Ingredients Used', 14, ingredientsStartY);

  autoTable(doc, {
    startY: ingredientsStartY + 5,
    head: [['Ingredient', 'Amount', 'Unit', 'Unit Price', 'Cost']],
    body: data.ingredients.map(ingredient => [
      ingredient.name,
      ingredient.amount.toFixed(2),
      ingredient.unit,
      formatIDR(ingredient.unitPrice),
      formatIDR(ingredient.cost)
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },  // Ingredient name
      1: { cellWidth: 30, halign: 'right' },  // Amount
      2: { cellWidth: 30 },  // Unit
      3: { cellWidth: 35, halign: 'right' },  // Unit Price
      4: { cellWidth: 35, halign: 'right' }   // Cost
    },
    foot: [['', '', '', 'Total Cost:', formatIDR(data.totalCost)]],
    footStyles: {
      fillColor: [249, 250, 251],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    }
  });

  return doc;
}