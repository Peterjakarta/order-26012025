import { utils, writeFile, WorkBook } from 'xlsx';
import type { Order, Product } from '../types/types';
import { getBranchName } from '../data/branches';
import { calculateMouldCount } from './mouldCalculations';
import { calculateExpiryDate } from './dateUtils';
import { isBonBonCategory, isPralinesCategory } from './quantityUtils';

// Function to generate Excel for orders
export function generateOrderExcel(order: Order, products: Product[], poNumber?: string) {
  // Get branch name using helper function
  const branchName = getBranchName(order.branchId);
  
  // Prepare header rows
  const headerRows = [
    ['Order Details'],
    ['Order #:', order.id.slice(0, 8)],
    ['Branch:', branchName],
    ['PO Number:', poNumber || order.poNumber || ''],
    ['Order Date:', new Date(order.orderDate).toLocaleDateString()],
    ['Production Date:', order.completedAt ? new Date(order.completedAt).toLocaleDateString() : ''],
    [''], // Empty row for spacing
    ['Product', 'Ordered', 'Produced', 'Stock', 'Reject', 'Reject Notes', 'Production Date', 'Expiry Date', 'Mould']
  ];

  // Prepare product rows
  const productRows = order.products.map(item => {
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

  // Add notes if present
  const notesRows = order.notes ? [
    [''], // Empty row for spacing
    ['Notes:', order.notes]
  ] : [];

  // Combine all rows
  const allRows = [...headerRows, ...productRows, ...notesRows];

  // Create workbook and worksheet
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(allRows);

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Product
    { wch: 15 }, // Ordered
    { wch: 15 }, // Produced
    { wch: 15 }, // Stock
    { wch: 15 }, // Reject
    { wch: 30 }, // Reject Notes
    { wch: 15 }, // Production Date
    { wch: 15 }, // Expiry Date
    { wch: 15 }  // Mould
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, 'Order Details');

  return wb;
}

// Function to generate Excel for generic data
export function generateExcelData(data: any[][], sheetName: string = 'Sheet1'): WorkBook {
  // Create workbook and worksheet
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(data);

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, sheetName);

  return wb;
}

// Helper function to save workbook
export function saveWorkbook(wb: WorkBook, filename: string) {
  writeFile(wb, filename);
}