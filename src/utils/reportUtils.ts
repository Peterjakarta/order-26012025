import { Order, Product, Recipe, Ingredient } from '../types/types';
import { utils, WorkBook } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIDR } from './currencyFormatter';
import { calculateRecipeCost } from './recipeCalculations';
import { ReportExportOptions } from '../components/management/reports/ReportExportDialog';

interface ReportData {
  totalProducts: Record<string, number>;
  totalRejects: number;
  rejectsByProduct: Record<string, {
    quantity: number;
    notes: string[];
  }>;
  totalIngredients: Record<string, number>;
  totalCost: number;
  materialCost: number;
  productionCost: number;
  overheadCost: number;
  rejectRate: number;
  productionEfficiency: number;
  orderNotes: Record<string, string>;
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
    materialCost: 0,
    productionCost: 0,
    overheadCost: 0,
    rejectRate: 0,
    productionEfficiency: 0,
    orderNotes: {}
  };

  let totalOrdered = 0;
  let totalProduced = 0;

  orders.forEach(order => {
    // Store any order notes
    if (order.notes) {
      reportData.orderNotes[order.id] = order.notes;
    }

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

        // Material cost tracking
        let recipeMaterialCost = 0;
        let recipeProductionCost = 0;
        let recipeOverheadCost = 0;

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
            const ingredientCost = unitPrice * scaledAmount;
            recipeMaterialCost += ingredientCost;
          }
        });

        // Calculate other costs
        if (recipe.laborCost) {
          recipeProductionCost += recipe.laborCost * scale;
        }

        if (recipe.packagingCost) {
          recipeProductionCost += recipe.packagingCost * scale;
        }

        if (recipe.equipmentCost) {
          recipeOverheadCost += recipe.equipmentCost * scale;
        }

        // Add to totals
        reportData.materialCost += recipeMaterialCost;
        reportData.productionCost += recipeProductionCost;
        reportData.overheadCost += recipeOverheadCost;
        reportData.totalCost += recipeMaterialCost + recipeProductionCost + recipeOverheadCost;
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
  endDate: string,
  orders: Order[] = [],
  recipes: Recipe[] = [], // Added recipes parameter here
  options: ReportExportOptions
): WorkBook {
  const wb = utils.book_new();

  // Summary sheet
  const summaryData: any[][] = [
    ['Production Report'],
    [`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
    ['Generated on:', new Date().toLocaleString()],
    ['']
  ];

  // Key Metrics - always include these
  summaryData.push(['Key Metrics']);

  if (options.content.materialCosts || options.content.productionCosts || options.content.overheadCosts) {
    const costRows = [];
    
    if (options.content.materialCosts) {
      costRows.push(['Material Costs:', formatIDR(reportData.materialCost)]);
    }
    
    if (options.content.productionCosts) {
      costRows.push(['Production Costs:', formatIDR(reportData.productionCost)]);
    }
    
    if (options.content.overheadCosts) {
      costRows.push(['Overhead Costs:', formatIDR(reportData.overheadCost)]);
    }
    
    costRows.push(['Total Cost:', formatIDR(reportData.totalCost)]);
    summaryData.push(...costRows);
  }

  if (options.content.qualityControl) {
    summaryData.push(
      ['Total Rejects:', reportData.totalRejects],
      ['Reject Rate:', `${reportData.rejectRate.toFixed(2)}%`],
      ['Production Efficiency:', `${reportData.productionEfficiency.toFixed(2)}%`]
    );
  }

  summaryData.push(['']);

  // Product Summary
  if (options.content.products) {
    summaryData.push(['Product Summary']);
    
    const productHeaderRow = ['Product', 'Quantity Produced'];
    if (options.content.qualityControl) productHeaderRow.push('Rejects');
    productHeaderRow.push('Unit');
    
    summaryData.push(productHeaderRow);

    Object.entries(reportData.totalProducts).forEach(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const productRow = [
        product.name,
        quantity
      ];
      
      if (options.content.qualityControl) {
        productRow.push(reportData.rejectsByProduct[productId]?.quantity || 0);
      }
      
      productRow.push(product.unit || 'pcs');
      
      summaryData.push(productRow);
    });

    summaryData.push(['']);
  }

  // Reject Details
  if (options.content.qualityControl && Object.keys(reportData.rejectsByProduct).length > 0) {
    summaryData.push(['Reject Details']);
    summaryData.push(['Product', 'Reject Quantity', 'Notes']);
    
    Object.entries(reportData.rejectsByProduct).forEach(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      summaryData.push([
        product.name,
        data.quantity,
        data.notes.join('; ')
      ]);
    });

    summaryData.push(['']);
  }

  // Ingredient Usage
  if (options.content.ingredients) {
    summaryData.push(['Ingredient Usage']);
    
    const ingredientHeaderRow = ['Ingredient', 'Amount Used', 'Unit'];
    if (options.content.materialCosts) ingredientHeaderRow.push('Cost');
    
    summaryData.push(ingredientHeaderRow);

    Object.entries(reportData.totalIngredients).forEach(([ingredientId, amount]) => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (!ingredient) return;
      
      const ingredientRow = [
        ingredient.name,
        amount,
        ingredient.unit
      ];
      
      if (options.content.materialCosts) {
        const unitPrice = ingredient.price / ingredient.packageSize;
        ingredientRow.push(formatIDR(unitPrice * amount));
      }
      
      summaryData.push(ingredientRow);
    });
  }

  // Order Notes
  if (options.content.notes && Object.keys(reportData.orderNotes).length > 0) {
    summaryData.push([''], ['Order Notes']);
    summaryData.push(['Order ID', 'Notes']);
    
    Object.entries(reportData.orderNotes).forEach(([orderId, notes]) => {
      summaryData.push([
        orderId.slice(0, 8), // Show first 8 chars of order ID
        notes
      ]);
    });
  }

  // Create and add summary worksheet
  const ws = utils.aoa_to_sheet(summaryData);
  utils.book_append_sheet(wb, ws, 'Report Summary');

  // If 'individual' organization is selected, create a sheet for each order
  if (options.organization === 'individual' && options.format !== 'summary') {
    // Keep track of worksheet names to avoid duplicates
    const usedSheetNames = new Set<string>();
    
    orders.forEach((order, index) => {
      const orderData: any[][] = [
        [`Order #${order.id.slice(0, 8)}`],
        ['Order Date:', new Date(order.orderDate).toLocaleDateString()],
        ['Completion Date:', order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'Not completed'],
      ];
      
      // Add PO number if available
      if (order.poNumber) {
        orderData.push(['PO Number:', order.poNumber]);
      }
      
      orderData.push(['']);

      if (options.content.products) {
        orderData.push(['Products']);
        
        const productHeaders = ['Product', 'Ordered', 'Produced'];
        if (options.content.qualityControl) {
          productHeaders.push('Rejected', 'Reject Notes');
        }
        orderData.push(productHeaders);
        
        order.products.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return;
          
          const productRow = [
            product.name,
            item.quantity,
            item.producedQuantity || 0
          ];
          
          if (options.content.qualityControl) {
            productRow.push(
              item.rejectQuantity || 0,
              item.rejectNotes || '-'
            );
          }
          
          orderData.push(productRow);
        });
        
        orderData.push(['']);
      }

      if (options.content.ingredients || options.content.materialCosts) {
        // Calculate ingredients for this specific order
        const orderIngredients: Record<string, number> = {};
        const orderIngredientCosts: Record<string, number> = {};
        
        order.products.forEach(item => {
          const recipe = recipes.find(r => r.productId === item.productId);
          if (!recipe) return;
          
          const producedQuantity = item.producedQuantity || item.quantity;
          const scale = producedQuantity / recipe.yield;
          
          recipe.ingredients.forEach(ingredient => {
            const ingredientId = ingredient.ingredientId;
            const scaledAmount = Math.ceil(ingredient.amount * scale);
            
            if (!orderIngredients[ingredientId]) {
              orderIngredients[ingredientId] = scaledAmount;
            } else {
              orderIngredients[ingredientId] += scaledAmount;
            }
            
            if (options.content.materialCosts) {
              const ingredientData = ingredients.find(i => i.id === ingredientId);
              if (ingredientData) {
                const unitPrice = ingredientData.price / ingredientData.packageSize;
                const cost = unitPrice * scaledAmount;
                
                if (!orderIngredientCosts[ingredientId]) {
                  orderIngredientCosts[ingredientId] = cost;
                } else {
                  orderIngredientCosts[ingredientId] += cost;
                }
              }
            }
          });
        });
        
        if (Object.keys(orderIngredients).length > 0) {
          orderData.push(['Ingredients Used']);
          
          const ingredientHeaders = ['Ingredient', 'Amount', 'Unit'];
          if (options.content.materialCosts) {
            ingredientHeaders.push('Cost');
          }
          orderData.push(ingredientHeaders);
          
          Object.entries(orderIngredients).forEach(([ingredientId, amount]) => {
            const ingredient = ingredients.find(i => i.id === ingredientId);
            if (!ingredient) return;
            
            const ingredientRow = [
              ingredient.name,
              amount,
              ingredient.unit
            ];
            
            if (options.content.materialCosts) {
              ingredientRow.push(formatIDR(orderIngredientCosts[ingredientId] || 0));
            }
            
            orderData.push(ingredientRow);
          });
          
          orderData.push(['']);
        }
      }

      // Add notes if present and selected
      if (options.content.notes && order.notes) {
        orderData.push(['Notes'], [order.notes], ['']);
      }

      // Create worksheet for this order
      const wsOrder = utils.aoa_to_sheet(orderData);
      
      // Generate a unique worksheet name for this order
      // Include PO number if available to make it clearer which order it is
      let baseSheetName = order.poNumber 
        ? `PO-${order.poNumber}-${index + 1}` 
        : `Order-${order.id.slice(0, 8)}-${index + 1}`;
      
      // Remove any invalid characters for Excel worksheet names
      const sanitizedName = baseSheetName.replace(/[\[\]\*\/\\\?:]/g, '');
      
      // Limit to Excel's 31 character limit
      let safeSheetName = sanitizedName.substring(0, 31);
      
      // Ensure uniqueness by adding a counter if needed
      let counter = 1;
      let finalSheetName = safeSheetName;
      
      while (usedSheetNames.has(finalSheetName)) {
        // If duplicate exists, create a new name with a counter
        const suffix = `-${counter}`;
        finalSheetName = safeSheetName.substring(0, 31 - suffix.length) + suffix;
        counter++;
      }
      
      // Add to used names
      usedSheetNames.add(finalSheetName);
      
      // Add worksheet with the safe, unique name
      utils.book_append_sheet(wb, wsOrder, finalSheetName);
    });
  }

  return wb;
}

export function generateReportPDF(
  reportData: ReportData,
  products: Product[],
  ingredients: Ingredient[],
  startDate: string,
  endDate: string,
  orders: Order[] = [],
  options: ReportExportOptions
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
  yPos += 10;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPos);
  yPos += 20;

  // Key Metrics
  doc.setFontSize(14);
  doc.text('Key Metrics', 14, yPos);
  yPos += 10;

  // Create metrics table based on selected options
  const metricsRows = [];

  if (options.content.materialCosts) {
    metricsRows.push(['Material Costs', formatIDR(reportData.materialCost)]);
  }
  
  if (options.content.productionCosts) {
    metricsRows.push(['Production Costs', formatIDR(reportData.productionCost)]);
  }
  
  if (options.content.overheadCosts) {
    metricsRows.push(['Overhead Costs', formatIDR(reportData.overheadCost)]);
  }
  
  // Always include total cost if any cost option is selected
  if (options.content.materialCosts || options.content.productionCosts || options.content.overheadCosts) {
    metricsRows.push(['Total Cost', formatIDR(reportData.totalCost)]);
  }

  if (options.content.qualityControl) {
    metricsRows.push(
      ['Total Rejects', reportData.totalRejects.toString()],
      ['Reject Rate', `${reportData.rejectRate.toFixed(2)}%`],
      ['Production Efficiency', `${reportData.productionEfficiency.toFixed(2)}%`]
    );
  }

  if (metricsRows.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: metricsRows,
      theme: 'striped',
      headStyles: {
        fillColor: [236, 72, 153],
        textColor: [255, 255, 255]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 70 }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Only add product summary if selected
  if (options.content.products) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Product Summary
    doc.setFontSize(14);
    doc.text('Product Summary', 14, yPos);
    yPos += 10;

    const productTableHeaders = ['Product', 'Quantity'];
    if (options.content.qualityControl) {
      productTableHeaders.push('Rejects');
    }
    productTableHeaders.push('Unit');

    const productTableBody = Object.entries(reportData.totalProducts).map(([productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return [];

      const row = [
        product.name,
        quantity.toString()
      ];

      if (options.content.qualityControl) {
        row.push((reportData.rejectsByProduct[productId]?.quantity || 0).toString());
      }

      row.push(product.unit || 'pcs');
      
      return row;
    }).filter(row => row.length > 0);

    if (productTableBody.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [productTableHeaders],
        body: productTableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: [255, 255, 255]
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Reject Details if quality control is selected
  if (options.content.qualityControl && Object.keys(reportData.rejectsByProduct).length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Reject Details', 14, yPos);
    yPos += 10;

    const rejectData = Object.entries(reportData.rejectsByProduct).map(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return [];
      
      return [
        product.name,
        data.quantity.toString(),
        data.notes.join('; ')
      ];
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
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 100 }
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Ingredient Usage if selected
  if (options.content.ingredients) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Ingredient Usage', 14, yPos);
    yPos += 10;

    const ingredientTableHeaders = ['Ingredient', 'Amount', 'Unit'];
    if (options.content.materialCosts) {
      ingredientTableHeaders.push('Cost');
    }

    const ingredientData = Object.entries(reportData.totalIngredients).map(([ingredientId, amount]) => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (!ingredient) return [];
      
      const row = [
        ingredient.name,
        amount.toString(),
        ingredient.unit
      ];
      
      if (options.content.materialCosts) {
        const unitPrice = ingredient.price / ingredient.packageSize;
        row.push(formatIDR(unitPrice * amount));
      }
      
      return row;
    }).filter(row => row.length > 0);

    if (ingredientData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [ingredientTableHeaders],
        body: ingredientData,
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: [255, 255, 255]
        }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Order Notes if selected
  if (options.content.notes && Object.keys(reportData.orderNotes).length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Order Notes', 14, yPos);
    yPos += 10;

    const notesData = Object.entries(reportData.orderNotes).map(([orderId, notes]) => [
      orderId.slice(0, 8),
      notes
    ]);

    if (notesData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Order ID', 'Notes']],
        body: notesData,
        theme: 'striped',
        headStyles: {
          fillColor: [236, 72, 153],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 150 }
        }
      });
    }
  }

  // If individual orders organization is selected and we want detailed format
  if (options.organization === 'individual' && options.format !== 'summary') {
    orders.forEach((order, index) => {
      // Add new page for each order
      if (index > 0 || yPos > doc.internal.pageSize.height - 100) {
        doc.addPage();
      }
      
      yPos = 20;

      // Order header
      doc.setFontSize(16);
      doc.text(`Order #${order.id.slice(0, 8)}`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`Order Date: ${new Date(order.orderDate).toLocaleDateString()}`, 14, yPos);
      yPos += 5;
      
      if (order.completedAt) {
        doc.text(`Completion Date: ${new Date(order.completedAt).toLocaleDateString()}`, 14, yPos);
        yPos += 5;
      }
      
      if (order.poNumber) {
        doc.text(`PO Number: ${order.poNumber}`, 14, yPos);
        yPos += 5;
      }
      
      yPos += 10;

      // Products table if selected
      if (options.content.products) {
        const productsTableHeaders = ['Product', 'Ordered', 'Produced'];
        if (options.content.qualityControl) {
          productsTableHeaders.push('Rejected', 'Reject Notes');
        }
        
        const productsTableBody = order.products.map(item => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return [];
          
          const row = [
            product.name,
            item.quantity.toString(),
            (item.producedQuantity || 0).toString()
          ];
          
          if (options.content.qualityControl) {
            row.push(
              (item.rejectQuantity || 0).toString(),
              item.rejectNotes || '-'
            );
          }
          
          return row;
        }).filter(row => row.length > 0);

        if (productsTableBody.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [productsTableHeaders],
            body: productsTableBody,
            theme: 'striped',
            headStyles: {
              fillColor: [236, 72, 153],
              textColor: [255, 255, 255]
            }
          });
          yPos = (doc as any).lastAutoTable.finalY + 15;
        }
      }

      // Add order notes if selected
      if (options.content.notes && order.notes) {
        if (yPos > doc.internal.pageSize.height - 40) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text('Order Notes:', 14, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        const splitText = doc.splitTextToSize(order.notes, 180);
        doc.text(splitText, 14, yPos);
      }
    });
  }

  return doc;
}