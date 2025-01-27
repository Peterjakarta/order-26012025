import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order, Product, Recipe, Ingredient, LogEntry } from '../types/types';
import { getBranchName } from '../data/branches';
import { calculateMouldCount } from './mouldCalculations';
import { calculateExpiryDate } from './dateUtils';
import { isBonBonCategory, isPralinesCategory } from './quantityUtils';
import { formatIDR } from './currencyFormatter';
import { calculateRecipeCost } from './recipeCalculations';

export function generateRecipePDF(recipe: Recipe, ingredients: Ingredient[], quantity: number) {
  // Create PDF document
  const doc = new jsPDF();
  
  // Calculate costs
  const baseCost = calculateRecipeCost(recipe, ingredients);
  const scaledCost = (baseCost / recipe.yield) * quantity;
  const laborCost = recipe.laborCost ? (recipe.laborCost / recipe.yield) * quantity : 0;
  const packagingCost = recipe.packagingCost ? (recipe.packagingCost / recipe.yield) * quantity : 0;
  const totalCost = scaledCost + laborCost + packagingCost;
  const costPerUnit = totalCost / quantity;

  // Calculate total weight
  const totalWeight = recipe.ingredients.reduce((total, item) => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return total;
    const scaledAmount = (item.amount / recipe.yield) * quantity;
    return total + scaledAmount;
  }, 0);

  // Header
  doc.setFontSize(20);
  doc.text('Recipe Cost Calculator', 14, 15);

  doc.setFontSize(12);
  doc.text(`Recipe: ${recipe.name}`, 14, 25);
  doc.text(`Quantity: ${quantity} ${recipe.yieldUnit}`, 14, 32);

  // Ingredients table
  const tableData = recipe.ingredients.map(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId);
    if (!ingredient) return [];

    const scaledAmount = (item.amount / recipe.yield) * quantity;
    const cost = (scaledAmount / ingredient.packageSize) * ingredient.price;

    return [
      ingredient.name,
      scaledAmount.toFixed(2),
      ingredient.unit,
      formatIDR(cost)
    ];
  }).filter(row => row.length > 0);

  autoTable(doc, {
    startY: 40,
    head: [['Ingredient', 'Amount', 'Unit', 'Cost']],
    body: tableData,
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
      3: { cellWidth: 40, halign: 'right' }   // Cost
    }
  });

  // Add total weight
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Total Weight: ${totalWeight.toFixed(2)} ${recipe.ingredients[0]?.unit}`, 14, finalY);

  // Cost breakdown
  const costStartY = finalY + 15;
  doc.text('Cost Breakdown:', 14, costStartY);
  
  const costData = [
    ['Base Cost:', formatIDR(scaledCost)],
    ['Labor Cost:', formatIDR(laborCost)],
    ['Packaging Cost:', formatIDR(packagingCost)],
    ['Total Cost:', formatIDR(totalCost)],
    [`Cost per ${recipe.yieldUnit}:`, formatIDR(costPerUnit)]
  ];

  autoTable(doc, {
    startY: costStartY + 5,
    body: costData,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' }
    }
  });

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
    const expiryDate = order.completedAt ? calculateExpiryDate(order.completedAt, product.category) : null;

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

export function generateLogbookPDF(entries: LogEntry[]) {
  // Create PDF document
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('System Logbook', 14, 15);

  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

  // Add entries table
  const tableData = entries.map(entry => [
    new Date(entry.timestamp).toLocaleString(),
    entry.username,
    entry.category,
    entry.action,
    entry.details || ''
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Timestamp', 'User', 'Category', 'Action', 'Details']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [236, 72, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 35 },  // Timestamp
      1: { cellWidth: 25 },  // User
      2: { cellWidth: 25 },  // Category
      3: { cellWidth: 35 },  // Action
      4: { cellWidth: 70 }   // Details
    }
  });

  return doc;
}