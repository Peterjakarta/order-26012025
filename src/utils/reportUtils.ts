import { Order, Product, Recipe, Ingredient } from '../types/types';
import { utils, WorkBook } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIDR } from './currencyFormatter';
import { calculateRecipeCost } from './recipeCalculations';

interface ReportData {
  totalProducts: Record<string, number>;
  totalRejects: number;
  rejectsByProduct: Record<string, {
    quantity: number;
    notes: string[];
  }>;
  totalIngredients: Record<string, number>;
  totalCost: number;
  rejectRate: number;
  productionEfficiency: number;
}

export function generateReport(
  orders: Order[],
  products: Product[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): ReportData {
  const reportData: ReportData = {
    totalProducts: {},
    totalRejects: 0,
    rejectsByProduct: {},
    totalIngredients: {},
    totalCost: 0,
    rejectRate: 0,
    productionEfficiency: 0
  };

  let totalOrdered = 0;
  let totalProduced = 0;

  orders.forEach(order => {
    order.products.forEach(product => {
      const productId = product.productId;
      const producedQuantity = product.producedQuantity || 0;
      const rejectQuantity = product.rejectQuantity || 0;
      const rejectNotes = product.rejectNotes || '';

      totalOrdered += product.quantity;
      totalProduced += producedQuantity;

      // Accumulate products
      if (!reportData.totalProducts[productId]) {
        reportData.totalProducts[productId] = producedQuantity;
      } else {
        reportData.totalProducts[productId] += producedQuantity;
      }

      // Accumulate rejects
      reportData.totalRejects += rejectQuantity;

      // Track rejects by product
      if (rejectQuantity > 0) {
        if (!reportData.rejectsByProduct[productId]) {
          reportData.rejectsByProduct[productId] = {
            quantity: rejectQuantity,
            notes: rejectNotes ? [rejectNotes] : []
          };
        } else {
          reportData.rejectsByProduct[productId].quantity += rejectQuantity;
          if (rejectNotes) {
            reportData.rejectsByProduct[productId].notes.push(rejectNotes);
          }
        }
      }

      // Accumulate ingredients based on recipes
      const recipe = recipes.find(r => r.productId === productId);
      if (recipe) {
        const scale = producedQuantity / recipe.yield;

        recipe.ingredients.forEach(ingredient => {
          const ingredientId = ingredient.ingredientId;
          const scaledAmount = Math.ceil(ingredient.amount * scale);

          if (!reportData.totalIngredients[ingredientId]) {
            reportData.totalIngredients[ingredientId] = scaledAmount;
          } else {
            reportData.totalIngredients[ingredientId] += scaledAmount;
          }

          // Calculate ingredient cost
          const ingredientData = ingredients.find(i => i.id === ingredientId);
          if (ingredientData) {
            const unitPrice = ingredientData.price / ingredientData.packageSize;
            reportData.totalCost += unitPrice * scaledAmount;
          }
        });
      }
    });
  });

  // Calculate efficiency metrics
  reportData.rejectRate = totalProduced > 0 ? (reportData.totalRejects / totalProduced) * 100 : 0;
  reportData.productionEfficiency = totalOrdered > 0 ? (totalProduced / totalOrdered) * 100 : 0;

  return reportData;
}

export function generateReportExcel(
  reportData: ReportData,
  products: Product[],
  ingredients: Ingredient[],
  startDate: string,
  endDate: string
): WorkBook {
  const wb = utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Production Report'],
    [`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
    [''],
    ['Key Metrics'],
    ['Total Cost:', formatIDR(reportData.totalCost)],
    ['Total Rejects:', reportData.totalRejects],
    ['Reject Rate:', `${reportData.rejectRate.toFixed(2)}%`],
    ['Production Efficiency:', `${reportData.productionEfficiency.toFixed(2)}%`],
    [''],
    ['Product Summary'],
    ['Product', 'Quantity Produced', 'Rejects', 'Unit']
  ];

  Object.entries(reportData.totalProducts).forEach(([productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    const rejects = reportData.rejectsByProduct[productId]?.quantity || 0;
    if (product) {
      summaryData.push([
        product.name,
        quantity,
        rejects,
        product.unit || 'pcs'
      ]);
    }
  });

  summaryData.push([''], ['Reject Details'], ['Product', 'Reject Quantity', 'Notes']);
  
  Object.entries(reportData.rejectsByProduct).forEach(([productId, data]) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      summaryData.push([
        product.name,
        data.quantity,
        data.notes.join('; ')
      ]);
    }
  });

  summaryData.push(
    [''],
    ['Ingredient Usage'],
    ['Ingredient', 'Amount Used', 'Unit', 'Cost']
  );

  Object.entries(reportData.totalIngredients).forEach(([ingredientId, amount]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (ingredient) {
      const unitPrice = ingredient.price / ingredient.packageSize;
      const cost = unitPrice * amount;
      summaryData.push([
        ingredient.name,
        amount,
        ingredient.unit,
        formatIDR(cost)
      ]);
    }
  });

  const ws = utils.aoa_to_sheet(summaryData);
  utils.book_append_sheet(wb, ws, 'Summary');

  return wb;
}

export function generateReportPDF(
  reportData: ReportData,
  products: Product[],
  ingredients: Ingredient[],
  startDate: string,
  endDate: string
): jsPDF {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Production Report', 14, yPos);
  yPos += 10;

  // Period
  doc.setFontSize(12);
  doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, yPos);
  yPos += 20;

  // Key Metrics
  doc.setFontSize(14);
  doc.text('Key Metrics', 14, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.text(`Total Cost: ${formatIDR(reportData.totalCost)}`, 14, yPos);
  yPos += 7;
  doc.text(`Total Rejects: ${reportData.totalRejects}`, 14, yPos);
  yPos += 7;
  doc.text(`Reject Rate: ${reportData.rejectRate.toFixed(2)}%`, 14, yPos);
  yPos += 7;
  doc.text(`Production Efficiency: ${reportData.productionEfficiency.toFixed(2)}%`, 14, yPos);
  yPos += 15;

  // Product Summary
  doc.setFontSize(14);
  doc.text('Product Summary', 14, yPos);
  yPos += 10;

  const productData = Object.entries(reportData.totalProducts).map(([productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    const rejects = reportData.rejectsByProduct[productId]?.quantity || 0;
    return product ? [
      product.name,
      quantity.toString(),
      rejects.toString(),
      product.unit || 'pcs'
    ] : [];
  }).filter(row => row.length > 0);

  if (productData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Product', 'Quantity', 'Rejects', 'Unit']],
      body: productData,
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255]
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Reject Details
  if (Object.keys(reportData.rejectsByProduct).length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Reject Details', 14, yPos);
    yPos += 10;

    const rejectData = Object.entries(reportData.rejectsByProduct).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      return product ? [
        product.name,
        data.quantity.toString(),
        data.notes.join('; ')
      ] : [];
    }).filter(row => row.length > 0);

    if (rejectData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Reject Quantity', 'Notes']],
        body: rejectData,
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: [255, 255, 255]
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Ingredient Usage
  if (yPos > doc.internal.pageSize.height - 60) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.text('Ingredient Usage', 14, yPos);
  yPos += 10;

  const ingredientData = Object.entries(reportData.totalIngredients).map(([ingredientId, amount]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return [];
    
    const unitPrice = ingredient.price / ingredient.packageSize;
    const cost = unitPrice * amount;
    
    return [
      ingredient.name,
      amount.toString(),
      ingredient.unit,
      formatIDR(cost)
    ];
  }).filter(row => row.length > 0);

  if (ingredientData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Ingredient', 'Amount', 'Unit', 'Cost']],
      body: ingredientData,
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255]
      }
    });
  }

  return doc;
}