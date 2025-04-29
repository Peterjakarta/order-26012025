import { utils, writeFile, WorkBook } from 'xlsx';
import type { Order, Product, Ingredient, StockLevel, StockCategory } from '../types/types';
import { getBranchName } from '../data/branches';
import { calculateMouldCount } from './mouldCalculations';
import { calculateExpiryDate } from './dateUtils';
import { isBonBonCategory, isPralinesCategory } from './quantityUtils';
import { formatIDR } from './currencyFormatter';

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

// New function to generate Excel for products list
export function generateProductsExcel(products: Product[], categories: Record<string, { name: string }>) {
  // Create header rows
  const headerRows = [
    ['Products List'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Product Name', 'Category', 'Description', 'Unit', 'Min Order', 'Price', 'Quantity Step']
  ];

  // Create product rows
  const productRows = products.map(product => [
    product.name,
    categories[product.category]?.name || product.category,
    product.description || '',
    product.unit || '',
    product.minOrder || '',
    product.price !== undefined ? product.price.toFixed(2) : '',
    product.quantityStep || ''
  ]);

  // Combine all rows
  const allRows = [...headerRows, ...productRows];

  // Create workbook and worksheet
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(allRows);

  // Set column widths for better readability
  const colWidths = [
    { wch: 40 }, // Product Name
    { wch: 25 }, // Category
    { wch: 60 }, // Description
    { wch: 15 }, // Unit
    { wch: 15 }, // Min Order
    { wch: 15 }, // Price
    { wch: 15 }  // Quantity Step
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, 'Products');

  return wb;
}

// Function to generate Excel for categories list
export function generateCategoriesExcel(categories: Record<string, { name: string }>, categoryOrder: string[], productsCount: Record<string, number>, allProducts: Product[] = []) {
  // Create workbook
  const wb = utils.book_new();
  
  // Create categories worksheet
  const categoryHeaderRows = [
    ['Categories List'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Category ID', 'Category Name', 'Products Count', 'Sort Order']
  ];

  // Create category rows
  const categoryRows = categoryOrder.map((categoryId, index) => [
    categoryId,
    categories[categoryId]?.name || categoryId,
    productsCount[categoryId] || 0,
    index + 1
  ]);

  // Combine category rows
  const allCategoryRows = [...categoryHeaderRows, ...categoryRows];
  const wsCategories = utils.aoa_to_sheet(allCategoryRows);

  // Set column widths for better readability
  const categoryColWidths = [
    { wch: 30 }, // Category ID
    { wch: 40 }, // Category Name
    { wch: 15 }, // Products Count
    { wch: 15 }  // Sort Order
  ];
  wsCategories['!cols'] = categoryColWidths;

  // Add categories worksheet to workbook
  utils.book_append_sheet(wb, wsCategories, 'Categories');
  
  // Create product worksheet for each category with products
  categoryOrder.forEach((categoryId) => {
    const categoryName = categories[categoryId]?.name || categoryId;
    const categoryProducts = allProducts.filter(p => p.category === categoryId);
    
    if (categoryProducts.length > 0) {
      // Create product list header
      const productHeaderRows = [
        [`${categoryName} Products`],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Product Name', 'Description', 'Unit', 'Min Order', 'Price', 'Quantity Step']
      ];
      
      // Create product rows for this category
      const productRows = categoryProducts.map(product => [
        product.name,
        product.description || '',
        product.unit || '',
        product.minOrder || '',
        product.price !== undefined ? product.price.toFixed(2) : '',
        product.quantityStep || ''
      ]);
      
      // Combine rows
      const allProductRows = [...productHeaderRows, ...productRows];
      const wsProducts = utils.aoa_to_sheet(allProductRows);
      
      // Set column widths for better readability
      const productColWidths = [
        { wch: 40 }, // Product Name
        { wch: 60 }, // Description
        { wch: 15 }, // Unit
        { wch: 15 }, // Min Order
        { wch: 15 }, // Price
        { wch: 15 }  // Quantity Step
      ];
      wsProducts['!cols'] = productColWidths;
      
      // Add worksheet to workbook - use safe sheet name (max 31 chars)
      const safeCategoryName = categoryName.length > 25 
        ? categoryName.substring(0, 25) + "..." 
        : categoryName;
      
      utils.book_append_sheet(wb, wsProducts, safeCategoryName);
    }
  });
  
  // Create a full products list worksheet
  const productHeaderRows = [
    ['All Products'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Product Name', 'Category', 'Description', 'Unit', 'Min Order', 'Price', 'Quantity Step']
  ];
  
  // Create product rows for all products
  const productRows = allProducts.map(product => [
    product.name,
    categories[product.category]?.name || product.category,
    product.description || '',
    product.unit || '',
    product.minOrder || '',
    product.price !== undefined ? product.price.toFixed(2) : '',
    product.quantityStep || ''
  ]);
  
  // Combine rows
  const allProductRows = [...productHeaderRows, ...productRows];
  const wsAllProducts = utils.aoa_to_sheet(allProductRows);
  
  // Set column widths for better readability
  const productColWidths = [
    { wch: 40 }, // Product Name
    { wch: 25 }, // Category
    { wch: 60 }, // Description
    { wch: 15 }, // Unit
    { wch: 15 }, // Min Order
    { wch: 15 }, // Price
    { wch: 15 }  // Quantity Step
  ];
  wsAllProducts['!cols'] = productColWidths;
  
  // Add worksheet to workbook
  utils.book_append_sheet(wb, wsAllProducts, 'All Products');

  return wb;
}

// Function to generate Excel for ingredients list
export function generateIngredientsExcel(
  ingredients: Ingredient[], 
  stockLevels: Record<string, StockLevel>, 
  stockCategories: StockCategory[], 
  ingredientCategories: Record<string, string[]>
) {
  // Create workbook
  const wb = utils.book_new();
  
  // Create main ingredients worksheet
  const headerRows = [
    ['Ingredients List'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Ingredient Name', 'Usage Unit', 'Package Size', 'Package Unit', 'Price (IDR)', 'Unit Price', 'Current Stock', 'Min Stock', 'Categories']
  ];

  // Create ingredient rows
  const ingredientRows = ingredients.map(ingredient => {
    const stockData = stockLevels[ingredient.id] || {};
    const unitPrice = ingredient.price / ingredient.packageSize;
    
    // Get categories this ingredient belongs to
    const categoriesStr = stockCategories
      .filter(cat => (ingredientCategories[cat.id] || []).includes(ingredient.id))
      .map(cat => cat.name)
      .join(', ');
    
    return [
      ingredient.name,
      ingredient.unit,
      ingredient.packageSize,
      ingredient.packageUnit,
      ingredient.price,
      formatIDR(unitPrice) + '/' + ingredient.unit,
      stockData.quantity || 0,
      stockData.minStock || '-',
      categoriesStr
    ];
  });

  // Combine all rows
  const allRows = [...headerRows, ...ingredientRows];
  const ws = utils.aoa_to_sheet(allRows);

  // Set column widths for better readability
  const colWidths = [
    { wch: 40 }, // Ingredient Name
    { wch: 15 }, // Usage Unit
    { wch: 15 }, // Package Size
    { wch: 15 }, // Package Unit
    { wch: 20 }, // Price (IDR)
    { wch: 20 }, // Unit Price
    { wch: 15 }, // Current Stock
    { wch: 15 }, // Min Stock
    { wch: 40 }  // Categories
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, 'Ingredients');
  
  // Create category worksheets
  stockCategories.forEach(category => {
    // Get ingredients for this category
    const categoryIngredientIds = ingredientCategories[category.id] || [];
    const categoryIngredients = ingredients.filter(ing => categoryIngredientIds.includes(ing.id));
    
    if (categoryIngredients.length > 0) {
      // Category header
      const categoryHeader = [
        [category.name],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Ingredient Name', 'Usage Unit', 'Package Size', 'Package Unit', 'Price (IDR)', 'Unit Price', 'Current Stock', 'Min Stock']
      ];
      
      // Category ingredient rows
      const categoryRows = categoryIngredients.map(ingredient => {
        const stockData = stockLevels[ingredient.id] || {};
        const unitPrice = ingredient.price / ingredient.packageSize;
        
        return [
          ingredient.name,
          ingredient.unit,
          ingredient.packageSize,
          ingredient.packageUnit,
          ingredient.price,
          formatIDR(unitPrice) + '/' + ingredient.unit,
          stockData.quantity || 0,
          stockData.minStock || '-'
        ];
      });
      
      // Create worksheet
      const wsCategory = utils.aoa_to_sheet([...categoryHeader, ...categoryRows]);
      
      // Set column widths
      wsCategory['!cols'] = colWidths.slice(0, 8);
      
      // Ensure category name is valid as worksheet name (max 31 chars)
      const safeCategoryName = category.name.length > 25 
        ? category.name.substring(0, 25) + "..." 
        : category.name;
      
      // Add worksheet
      utils.book_append_sheet(wb, wsCategory, safeCategoryName);
    }
  });
  
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