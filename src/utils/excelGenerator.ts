import { utils, writeFile, WorkBook } from 'xlsx';
import type { Order, Product, Ingredient, StockLevel, StockCategory, Recipe } from '../types/types';
import { getBranchName } from '../data/branches';
import { calculateMouldCount } from './mouldCalculations';
import { calculateExpiryDate } from './dateUtils';
import { isBonBonCategory, isPralinesCategory } from './quantityUtils';
import { formatIDR } from './currencyFormatter';
import { calculateRecipeCost } from './recipeCalculations';
import { ExportOptions } from '../components/management/pricing/ExportOptionsDialog';

// Helper function to sanitize sheet names for Excel compatibility
function sanitizeSheetName(name: string): string {
  // Excel sheet name cannot contain: : \ / ? * [ ]
  // Replace invalid characters with dashes
  let sanitized = name.replace(/[:\/\\?*\[\]]/g, '-');
  
  // Truncate to max 31 characters (Excel limit)
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 28) + '...';
  }
  
  return sanitized;
}

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
  utils.book_append_sheet(wb, ws, sanitizeSheetName('Order Details'));

  return wb;
}

// Function to generate Excel for recipes (batch export)
export function generateRecipesExcel(
  recipes: Recipe[],
  products: Product[],
  ingredients: Ingredient[],
  categories: Record<string, { name: string }>
) {
  // Create workbook
  const wb = utils.book_new();

  // Create summary worksheet with all recipes
  const summaryHeaderRows = [
    ['Recipes Summary'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    ['Recipe Name', 'Category', 'Product', 'Yield', 'Yield Unit', 'Base Cost', 'Labor Cost', 'Packaging Cost', 'Total Cost', 'Unit Cost']
  ];

  // Create recipe rows for summary sheet
  const recipeRows = recipes.map(recipe => {
    const product = products.find(p => p.id === recipe.productId);
    const categoryName = categories[recipe.category]?.name || recipe.category;
    
    // Calculate costs
    const baseCost = calculateRecipeCost(recipe, ingredients);
    const laborCost = recipe.laborCost || 0;
    const packagingCost = recipe.packagingCost || 0;
    const totalCost = baseCost + laborCost + packagingCost;
    const unitCost = recipe.yield > 0 ? totalCost / recipe.yield : 0;
    
    return [
      recipe.name,
      categoryName,
      product?.name || 'Unknown Product',
      recipe.yield,
      recipe.yieldUnit,
      formatIDR(baseCost),
      formatIDR(laborCost),
      formatIDR(packagingCost),
      formatIDR(totalCost),
      formatIDR(unitCost)
    ];
  });

  // Combine all rows for summary
  const allSummaryRows = [...summaryHeaderRows, ...recipeRows];
  const wsSummary = utils.aoa_to_sheet(allSummaryRows);

  // Set column widths for summary
  const summaryColWidths = [
    { wch: 40 }, // Recipe Name
    { wch: 20 }, // Category
    { wch: 40 }, // Product
    { wch: 10 }, // Yield
    { wch: 10 }, // Yield Unit
    { wch: 15 }, // Base Cost
    { wch: 15 }, // Labor Cost
    { wch: 15 }, // Packaging Cost
    { wch: 15 }, // Total Cost
    { wch: 15 }  // Unit Cost
  ];
  wsSummary['!cols'] = summaryColWidths;

  // Add summary worksheet
  utils.book_append_sheet(wb, wsSummary, sanitizeSheetName('All Recipes'));
  
  // Create individual worksheets for each recipe with detailed information
  recipes.forEach(recipe => {
    // Skip if invalid recipe or no ingredients
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return;
    
    const product = products.find(p => p.id === recipe.productId);
    const categoryName = categories[recipe.category]?.name || recipe.category;
    
    // Calculate costs
    const baseCost = calculateRecipeCost(recipe, ingredients);
    const laborCost = recipe.laborCost || 0;
    const packagingCost = recipe.packagingCost || 0;
    const totalCost = baseCost + laborCost + packagingCost;
    const unitCost = recipe.yield > 0 ? totalCost / recipe.yield : 0;
    
    // Create recipe header
    const recipeHeaderRows = [
      [recipe.name],
      ['Category:', categoryName],
      ['Product:', product?.name || 'Unknown Product'],
      ['Yield:', `${recipe.yield} ${recipe.yieldUnit}`],
      [''],
      ['Ingredients']
    ];
    
    // Add ingredients table header
    recipeHeaderRows.push(['Name', 'Amount', 'Unit', 'Unit Price', 'Cost']);
    
    // Add ingredients rows
    const ingredientRows = recipe.ingredients.map(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredientId);
      if (!ingredient) return [];
      
      const unitPrice = ingredient.price / ingredient.packageSize;
      const cost = unitPrice * item.amount;
      
      return [
        ingredient.name,
        item.amount,
        ingredient.unit,
        formatIDR(unitPrice),
        formatIDR(cost)
      ];
    }).filter(row => row.length > 0);
    
    // Add cost summary
    const costSummaryRows = [
      [''],
      ['Cost Summary'],
      ['Base Cost:', formatIDR(baseCost)],
      ['Labor Cost:', formatIDR(laborCost)],
      ['Packaging Cost:', formatIDR(packagingCost)],
      ['Total Cost:', formatIDR(totalCost)],
      [`Cost per ${recipe.yieldUnit}:`, formatIDR(unitCost)]
    ];
    
    // Add notes if present
    const notesRows = recipe.notes ? [
      [''],
      ['Notes:'],
      [recipe.notes]
    ] : [];
    
    // Combine all rows
    const allRecipeRows = [
      ...recipeHeaderRows,
      ...ingredientRows,
      ...costSummaryRows,
      ...notesRows
    ];
    
    // Create worksheet
    const wsRecipe = utils.aoa_to_sheet(allRecipeRows);
    
    // Set column widths
    const recipeColWidths = [
      { wch: 40 }, // Name/Label
      { wch: 15 }, // Amount/Value
      { wch: 15 }, // Unit
      { wch: 20 }, // Unit Price
      { wch: 20 }  // Cost
    ];
    wsRecipe['!cols'] = recipeColWidths;
    
    // Add worksheet - use safe sheet name (max 31 chars)
    const safeRecipeName = sanitizeSheetName(recipe.name);
      
    utils.book_append_sheet(wb, wsRecipe, safeRecipeName);
  });
  
  // Create category-based worksheets
  const recipesByCategory = recipes.reduce((acc, recipe) => {
    const categoryId = recipe.category;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(recipe);
    return acc;
  }, {} as Record<string, Recipe[]>);
  
  // Create a worksheet for each category
  Object.entries(recipesByCategory).forEach(([categoryId, categoryRecipes]) => {
    const categoryName = categories[categoryId]?.name || categoryId;
    
    // Category header
    const categoryHeader = [
      [`${categoryName} Recipes`],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Recipe Name', 'Product', 'Yield', 'Total Cost', 'Unit Cost', 'Ingredients Count']
    ];
    
    // Create recipe rows for this category
    const categoryRows = categoryRecipes.map(recipe => {
      const product = products.find(p => p.id === recipe.productId);
      
      // Calculate costs
      const baseCost = calculateRecipeCost(recipe, ingredients);
      const laborCost = recipe.laborCost || 0;
      const packagingCost = recipe.packagingCost || 0;
      const totalCost = baseCost + laborCost + packagingCost;
      const unitCost = recipe.yield > 0 ? totalCost / recipe.yield : 0;
      
      return [
        recipe.name,
        product?.name || 'Unknown Product',
        `${recipe.yield} ${recipe.yieldUnit}`,
        formatIDR(totalCost),
        formatIDR(unitCost),
        recipe.ingredients.length
      ];
    });
    
    // Create worksheet
    const wsCategory = utils.aoa_to_sheet([...categoryHeader, ...categoryRows]);
    
    // Set column widths
    const categoryColWidths = [
      { wch: 40 }, // Recipe Name
      { wch: 40 }, // Product
      { wch: 15 }, // Yield
      { wch: 15 }, // Total Cost
      { wch: 15 }, // Unit Cost
      { wch: 15 }  // Ingredients Count
    ];
    wsCategory['!cols'] = categoryColWidths;
    
    // Ensure category name is valid as worksheet name
    const safeCategoryName = sanitizeSheetName(categoryName);
    
    // Add worksheet
    utils.book_append_sheet(wb, wsCategory, safeCategoryName);
  });

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
  utils.book_append_sheet(wb, ws, sanitizeSheetName('Products'));

  return wb;
}

// Function to generate Excel for categories list
export function generateCategoriesExcel(categories: Record<string, { name: string }>, categoryOrder: string[], productsCount: Record<string, number>, allProducts: Product[] = [], ingredients: Ingredient[] = [], includeHACCP: boolean = false) {
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
  utils.book_append_sheet(wb, wsCategories, sanitizeSheetName('Categories'));
  
  // Create a separate worksheet for each individual product
  categoryOrder.forEach((categoryId) => {
    const categoryName = categories[categoryId]?.name || categoryId;
    const categoryProducts = allProducts.filter(p => p.category === categoryId);

    categoryProducts.forEach((product) => {
      // Create product detail header
      const productDetailRows: any[] = [
        ['Product Details'],
        ['Category:', categoryName],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Field', 'Value'],
        ['Product Name', product.name],
        ['Description', product.description || ''],
        ['Unit', product.unit || ''],
        ['Min Order', product.minOrder || ''],
        ['Price', product.price !== undefined ? product.price.toFixed(2) : ''],
        ['Quantity Step', product.quantityStep || ''],
        ['Show Price', product.showPrice ? 'Yes' : 'No'],
        ['Show Description', product.showDescription ? 'Yes' : 'No'],
        ['Show Min Order', product.showMinOrder ? 'Yes' : 'No'],
        ['Show Unit', product.showUnit ? 'Yes' : 'No']
      ];

      // Add HACCP information if requested and available
      if (includeHACCP && product.haccp) {
        productDetailRows.push([''], ['HACCP Information', '']);

        if (product.haccp.internalProductionCode) {
          productDetailRows.push(['Internal Production Code', product.haccp.internalProductionCode]);
        }

        if (product.haccp.productCategories) {
          const categoryName = categories[product.haccp.productCategories]?.name || product.haccp.productCategories;
          productDetailRows.push(['Product Categories', categoryName]);
        }

        if (product.haccp.productDescription) {
          productDetailRows.push(['Product Description', product.haccp.productDescription]);
        }

        if (product.haccp.ingredients && product.haccp.ingredients.length > 0) {
          const ingredientNames = product.haccp.ingredients
            .map(id => ingredients.find(i => i.id === id)?.name || id)
            .join(', ');
          productDetailRows.push(['Ingredients', ingredientNames]);
        }

        if (product.haccp.shelfLifeWeeks) {
          productDetailRows.push(['Shelf Life', `${product.haccp.shelfLifeWeeks} ${product.haccp.shelfLifeWeeks === 1 ? 'week' : 'weeks'}`]);
        }

        if (product.haccp.awValue) {
          productDetailRows.push(['AW Value', product.haccp.awValue]);
        }

        if (product.haccp.storageTemperature) {
          productDetailRows.push(['Storage Temperature', product.haccp.storageTemperature]);
        }

        if (product.haccp.storageHumidity) {
          productDetailRows.push(['Storage Humidity', product.haccp.storageHumidity]);
        }

        if (product.haccp.allergens && product.haccp.allergens.length > 0) {
          productDetailRows.push(['Allergens', product.haccp.allergens.join(', ')]);
        }

        productDetailRows.push([''], ['Packing Information', '']);

        if (product.haccp.innerPackingId) {
          const packingName = ingredients.find(i => i.id === product.haccp.innerPackingId)?.name || product.haccp.innerPackingId;
          productDetailRows.push(['Inner Packing', packingName]);
        }

        if (product.haccp.outerPackingId) {
          const packingName = ingredients.find(i => i.id === product.haccp.outerPackingId)?.name || product.haccp.outerPackingId;
          productDetailRows.push(['Outer Packing', packingName]);
        }

        if (product.haccp.shippingPackingId) {
          const packingName = ingredients.find(i => i.id === product.haccp.shippingPackingId)?.name || product.haccp.shippingPackingId;
          productDetailRows.push(['Shipping Packing', packingName]);
        }
      }

      const wsProduct = utils.aoa_to_sheet(productDetailRows);

      // Set column widths for better readability
      const productColWidths = [
        { wch: 20 }, // Field
        { wch: 60 }  // Value
      ];
      wsProduct['!cols'] = productColWidths;

      // Create a safe sheet name from product name
      // Limit to 31 characters for Excel compatibility
      let safeProductName = sanitizeSheetName(product.name);
      if (safeProductName.length > 31) {
        safeProductName = safeProductName.substring(0, 28) + '...';
      }

      utils.book_append_sheet(wb, wsProduct, safeProductName);
    });
  });
  
  // Create a full products list worksheet
  const productHeaderRow = ['Product Name', 'Category', 'Description', 'Unit', 'Min Order', 'Price', 'Quantity Step'];

  if (includeHACCP) {
    productHeaderRow.push(
      'Internal Code',
      'Product Categories',
      'Product Description',
      'Ingredients',
      'Shelf Life (weeks)',
      'AW Value',
      'Storage Temp',
      'Storage Humidity',
      'Allergens',
      'Inner Packing',
      'Outer Packing',
      'Shipping Packing'
    );
  }

  const productHeaderRows = [
    ['All Products'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
    productHeaderRow
  ];

  // Create product rows for all products
  const productRows = allProducts.map(product => {
    const baseRow = [
      product.name,
      categories[product.category]?.name || product.category,
      product.description || '',
      product.unit || '',
      product.minOrder || '',
      product.price !== undefined ? product.price.toFixed(2) : '',
      product.quantityStep || ''
    ];

    if (includeHACCP) {
      const productCategoryName = product.haccp?.productCategories
        ? (categories[product.haccp.productCategories]?.name || product.haccp.productCategories)
        : '';

      const ingredientNames = product.haccp?.ingredients && product.haccp.ingredients.length > 0
        ? product.haccp.ingredients
            .map(id => ingredients.find(i => i.id === id)?.name || id)
            .join(', ')
        : '';

      baseRow.push(
        product.haccp?.internalProductionCode || '',
        productCategoryName,
        product.haccp?.productDescription || '',
        ingredientNames,
        product.haccp?.shelfLifeWeeks || '',
        product.haccp?.awValue || '',
        product.haccp?.storageTemperature || '',
        product.haccp?.storageHumidity || '',
        product.haccp?.allergens?.join(', ') || '',
        product.haccp?.innerPackingId ? (ingredients.find(i => i.id === product.haccp.innerPackingId)?.name || '') : '',
        product.haccp?.outerPackingId ? (ingredients.find(i => i.id === product.haccp.outerPackingId)?.name || '') : '',
        product.haccp?.shippingPackingId ? (ingredients.find(i => i.id === product.haccp.shippingPackingId)?.name || '') : ''
      );
    }

    return baseRow;
  });

  // Combine rows
  const allProductRows = [...productHeaderRows, ...productRows];
  const wsAllProducts = utils.aoa_to_sheet(allProductRows);

  // Set column widths for better readability
  const productColWidths: any[] = [
    { wch: 40 }, // Product Name
    { wch: 25 }, // Category
    { wch: 60 }, // Description
    { wch: 15 }, // Unit
    { wch: 15 }, // Min Order
    { wch: 15 }, // Price
    { wch: 15 }  // Quantity Step
  ];

  if (includeHACCP) {
    productColWidths.push(
      { wch: 20 }, // Internal Code
      { wch: 25 }, // Product Categories
      { wch: 50 }, // Product Description
      { wch: 60 }, // Ingredients
      { wch: 15 }, // Shelf Life
      { wch: 12 }, // AW Value
      { wch: 20 }, // Storage Temp
      { wch: 20 }, // Storage Humidity
      { wch: 40 }, // Allergens
      { wch: 25 }, // Inner Packing
      { wch: 25 }, // Outer Packing
      { wch: 25 }  // Shipping Packing
    );
  }

  wsAllProducts['!cols'] = productColWidths;
  
  // Add worksheet to workbook
  utils.book_append_sheet(wb, wsAllProducts, sanitizeSheetName('All Products'));

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
  utils.book_append_sheet(wb, ws, sanitizeSheetName('Ingredients'));
  
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
      
      // Add worksheet with sanitized name
      const safeCategoryName = sanitizeSheetName(category.name);
      
      // Add worksheet
      utils.book_append_sheet(wb, wsCategory, safeCategoryName);
    }
  });
  
  return wb;
}

// Function to generate Excel for selected recipes
export function generateSelectedRecipesExcel(
  selectedRecipes: Recipe[],
  allRecipes: Recipe[],
  products: Product[],
  ingredients: Ingredient[],
  categories: Record<string, { name: string }>,
  options?: ExportOptions
): WorkBook {
  // Default options if not provided
  const exportOptions = options || {
    includeCosts: true,
    includeOverheadCosts: true,
    includeIngredients: true,
    includeNotes: true,
    exportFormat: 'excel'
  };

  // Create workbook
  const wb = utils.book_new();

  // Create summary worksheet with selected recipes
  const summaryHeaderRows = [
    ['Selected Recipes Summary'],
    ['Generated on:', new Date().toLocaleString()],
    [''],
  ];
  
  // Add header columns based on options
  const headerColumns = ['Recipe Name', 'Category', 'Product', 'Yield', 'Yield Unit'];
  
  if (exportOptions.includeCosts) {
    headerColumns.push('Base Cost');
    if (exportOptions.includeOverheadCosts) {
      headerColumns.push('Labor Cost', 'Packaging Cost', 'Equipment Cost');
    }
    headerColumns.push('Total Cost', 'Unit Cost');
  }
  
  summaryHeaderRows.push(headerColumns);

  // Create recipe rows for summary sheet
  const recipeRows = selectedRecipes.map(recipe => {
    const product = products.find(p => p.id === recipe.productId);
    const categoryName = categories[recipe.category]?.name || recipe.category;
    
    // Calculate costs if needed
    const baseCost = exportOptions.includeCosts ? calculateRecipeCost(recipe, ingredients) : 0;
    const laborCost = exportOptions.includeOverheadCosts ? (recipe.laborCost || 0) : 0;
    const packagingCost = exportOptions.includeOverheadCosts ? (recipe.packagingCost || 0) : 0;
    const equipmentCost = exportOptions.includeOverheadCosts ? (recipe.equipmentCost || 0) : 0;
    const totalCost = exportOptions.includeCosts ? baseCost + laborCost + packagingCost + equipmentCost : 0;
    const unitCost = exportOptions.includeCosts ? (recipe.yield > 0 ? totalCost / recipe.yield : 0) : 0;
    
    // Create row with base fields
    const row = [
      recipe.name,
      categoryName,
      product?.name || 'Unknown Product',
      recipe.yield,
      recipe.yieldUnit
    ];
    
    // Add cost fields if enabled
    if (exportOptions.includeCosts) {
      row.push(formatIDR(baseCost));
      if (exportOptions.includeOverheadCosts) {
        row.push(formatIDR(laborCost), formatIDR(packagingCost), formatIDR(equipmentCost));
      }
      row.push(formatIDR(totalCost), formatIDR(unitCost));
    }
    
    return row;
  });

  // Combine all rows for summary
  const allSummaryRows = [...summaryHeaderRows, ...recipeRows];
  const wsSummary = utils.aoa_to_sheet(allSummaryRows);

  // Set column widths for summary
  const summaryColWidths = [
    { wch: 40 }, // Recipe Name
    { wch: 20 }, // Category
    { wch: 40 }, // Product
    { wch: 10 }, // Yield
    { wch: 10 }, // Yield Unit
    { wch: 15 }, // Base Cost
    { wch: 15 }, // Labor Cost
    { wch: 15 }, // Packaging Cost
    { wch: 15 }, // Equipment Cost
    { wch: 15 }, // Total Cost
    { wch: 15 }  // Unit Cost
  ];
  wsSummary['!cols'] = summaryColWidths;

  // Add summary worksheet
  utils.book_append_sheet(wb, wsSummary, sanitizeSheetName('All Recipes'));
  
  // Only add detailed recipe sheets if ingredients are included
  if (exportOptions.includeIngredients) {
    // Create individual worksheets for each recipe with detailed information
    selectedRecipes.forEach(recipe => {
      // Get recipe data
      const product = products.find(p => p.id === recipe.productId);
      const categoryName = categories[recipe.category]?.name || recipe.category;
      
      // Create recipe header
      const recipeHeaderRows = [
        [recipe.name],
        ['Category:', categoryName],
        ['Product:', product?.name || 'Unknown Product'],
        ['Yield:', `${recipe.yield} ${recipe.yieldUnit}`],
        ['']
      ];
      
      // Add ingredients table if needed
      if (recipe.ingredients.length > 0) {
        recipeHeaderRows.push(['Ingredients']);
        
        // Determine columns based on options
        const ingredientColumns = ['Name', 'Amount', 'Unit'];
        if (exportOptions.includeCosts) {
          ingredientColumns.push('Unit Price', 'Cost');
        }
        
        recipeHeaderRows.push(ingredientColumns);
        
        // Add ingredient rows
        const ingredientRows = recipe.ingredients.map(item => {
          const ingredient = ingredients.find(i => i.id === item.ingredientId);
          if (!ingredient) return [];
          
          // Base row with name, amount, unit
          const row = [
            ingredient.name,
            item.amount,
            ingredient.unit
          ];
          
          // Add cost columns if needed
          if (exportOptions.includeCosts) {
            const unitPrice = ingredient.price / ingredient.packageSize;
            const cost = unitPrice * item.amount;
            row.push(formatIDR(unitPrice), formatIDR(cost));
          }
          
          return row;
        }).filter(row => row.length > 0);
        
        recipeHeaderRows.push(...ingredientRows);
      }
      
      // Add cost summary if needed
      if (exportOptions.includeCosts) {
        const baseCost = calculateRecipeCost(recipe, ingredients);
        const laborCost = recipe.laborCost || 0;
        const packagingCost = recipe.packagingCost || 0;
        const equipmentCost = recipe.equipmentCost || 0;
        const totalCost = baseCost + (exportOptions.includeOverheadCosts ? 
          (laborCost + packagingCost + equipmentCost) : 0);
        const unitCost = recipe.yield > 0 ? totalCost / recipe.yield : 0;
        
        recipeHeaderRows.push([''], ['Cost Summary']);
        
        recipeHeaderRows.push(['Base Cost:', formatIDR(baseCost)]);
        
        if (exportOptions.includeOverheadCosts) {
          recipeHeaderRows.push(
            ['Labor Cost:', formatIDR(laborCost)],
            ['Packaging Cost:', formatIDR(packagingCost)],
            ['Equipment Cost:', formatIDR(equipmentCost)]
          );
        }
        
        recipeHeaderRows.push(
          ['Total Cost:', formatIDR(totalCost)],
          [`Cost per ${recipe.yieldUnit}:`, formatIDR(unitCost)]
        );
      }
      
      // Add notes if present and enabled
      if (exportOptions.includeNotes && recipe.notes) {
        recipeHeaderRows.push([''], ['Notes:'], [recipe.notes]);
      }
      
      // Create worksheet
      const wsRecipe = utils.aoa_to_sheet(recipeHeaderRows);
      
      // Add worksheet - use safe sheet name
      const safeRecipeName = sanitizeSheetName(recipe.name);
        
      utils.book_append_sheet(wb, wsRecipe, safeRecipeName);
    });
  }
  
  return wb;
}

// Function to generate Excel for generic data
export function generateExcelData(data: any[][], sheetName: string = 'Sheet1'): WorkBook {
  // Create workbook and worksheet
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(data);

  // Add worksheet to workbook
  utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName));

  return wb;
}

// Helper function to save workbook
export function saveWorkbook(wb: WorkBook, filename: string) {
  writeFile(wb, filename);
}