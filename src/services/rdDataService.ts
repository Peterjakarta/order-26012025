import { RDCategory, RDProduct, TestResult, RecipeIngredient } from '../types/rd-types';
import { createLogEntry } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { db, COLLECTIONS } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Storage keys
export const RD_CATEGORIES_KEY = 'rd-categories-data';
export const RD_PRODUCTS_KEY = 'rd-products-data';

// Demo data for initial implementation
export const DEMO_RD_CATEGORIES: RDCategory[] = [
  {
    id: 'rd-category-1',
    name: 'Experimental Truffles',
    description: 'New and innovative truffle flavors and designs',
    status: 'active',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'rd-category-2',
    name: 'Sugar-Free Products',
    description: 'Chocolate products with no added sugars',
    status: 'active',
    createdAt: '2025-02-10T14:45:00Z',
    updatedAt: '2025-02-12T09:15:00Z',
  },
  {
    id: 'rd-category-3',
    name: 'Vegan Range',
    description: 'Plant-based chocolate products with no animal ingredients',
    status: 'active',
    createdAt: '2025-02-20T11:00:00Z',
    updatedAt: '2025-02-20T11:00:00Z',
  },
  {
    id: 'rd-category-4',
    name: 'Single Origin Series',
    description: 'Chocolates made from beans of specific regions',
    status: 'active',
    createdAt: '2024-12-05T16:30:00Z',
    updatedAt: '2025-01-10T13:20:00Z',
  }
];

export const DEMO_RD_PRODUCTS: RDProduct[] = [
  {
    id: 'rd-product-1',
    name: 'Ruby Chocolate Pralines',
    category: 'pralines',
    description: 'Premium pralines made with ruby chocolate and raspberry filling',
    unit: 'boxes',
    minOrder: 5,
    price: 32.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-10',
    targetProductionDate: '2025-07-15',
    status: 'development',
    notes: 'Working on stabilizing the raspberry filling. Need to test shelf life at room temperature.',
    imageUrls: [
      'https://images.unsplash.com/photo-1548907040-4baa42d10919?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHJ1Ynklc2hvY29sYXRlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cmFzcGJlcnJ5fGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 15.75,
    createdBy: 'admin',
    createdAt: '2025-01-10T09:30:00Z',
    updatedAt: '2025-01-15T14:20:00Z'
  },
  {
    id: 'rd-product-2',
    name: 'Matcha Infused Truffles',
    category: 'truffles',
    description: 'White chocolate truffles with premium matcha powder',
    unit: 'boxes',
    minOrder: 4,
    price: 28.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-02-05',
    targetProductionDate: '2025-06-01',
    status: 'testing',
    notes: 'Trying different matcha suppliers for best color and flavor profile. Current batch has great color but slightly bitter aftertaste.',
    imageUrls: [
      'https://images.unsplash.com/photo-1581200005213-6fe9842cefd4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bWF0Y2hhJTIwY2hvY29sYXRlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 12.50,
    createdBy: 'admin',
    createdAt: '2025-02-05T11:15:00Z',
    updatedAt: '2025-02-20T16:45:00Z'
  },
  {
    id: 'rd-product-3',
    name: 'Salted Caramel Bonbons',
    category: 'bonbon',
    description: 'Milk chocolate bonbons with salted caramel filling',
    unit: 'boxes',
    minOrder: 6,
    price: 34.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2024-12-15',
    status: 'approved',
    notes: 'Recipe finalized and approved for production. First batch scheduled for June production.',
    imageUrls: [
      'https://images.unsplash.com/photo-1582176604856-e824b4736522?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2FyYW1lbCUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 16.25,
    createdBy: 'admin',
    createdAt: '2024-12-15T10:00:00Z',
    updatedAt: '2025-03-01T09:30:00Z'
  },
  {
    id: 'rd-product-4',
    name: 'Vegan Dark Chocolate Truffles',
    category: 'rd-category-3', // Vegan Range
    description: 'Plant-based dark chocolate truffles with coconut cream',
    unit: 'boxes',
    minOrder: 5,
    price: 29.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-02-01',
    targetProductionDate: '2025-05-15',
    status: 'testing',
    notes: 'Testing shelf stability and mouthfeel. Current version is promising but needs texture adjustment.',
    imageUrls: [
      'https://images.unsplash.com/photo-1608221386777-6c3c1a506291?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGRhcmslMjBjaG9jb2xhdGUlMjB0cnVmZmxlfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 14.25,
    createdBy: 'admin',
    createdAt: '2025-02-01T09:15:00Z',
    updatedAt: '2025-02-10T16:30:00Z'
  },
  {
    id: 'rd-product-5',
    name: 'Sugar-Free Milk Chocolate',
    category: 'rd-category-2', // Sugar-Free Products
    description: 'Milk chocolate sweetened with stevia and erythritol',
    unit: 'bars',
    minOrder: 10,
    price: 5.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-20',
    targetProductionDate: '2025-04-10',
    status: 'development',
    notes: 'Working on improving the aftertaste from stevia. Latest batch shows promise with new stevia extract.',
    imageUrls: [
      'https://images.unsplash.com/photo-1614088685112-0b05b6f1e570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bWlsayUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 3.25,
    createdBy: 'admin',
    createdAt: '2025-01-20T11:30:00Z',
    updatedAt: '2025-01-28T13:45:00Z'
  },
  {
    id: 'rd-product-6',
    name: 'Experimental Whiskey Ganache',
    category: 'rd-category-1', // Experimental Truffles
    description: 'Dark chocolate ganache infused with single malt whiskey',
    unit: 'boxes',
    minOrder: 3,
    price: 45.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2025-01-15',
    targetProductionDate: '2025-03-30',
    status: 'testing',
    notes: 'Testing different whiskey varieties. Need to balance alcohol content for flavor vs shelf stability.',
    imageUrls: [
      'https://images.unsplash.com/photo-1620504600375-4793e85ecbd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hvY29sYXRlJTIwZ2FuYWNoZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 22.30,
    createdBy: 'admin',
    createdAt: '2025-01-15T15:20:00Z',
    updatedAt: '2025-02-05T10:10:00Z'
  },
  {
    id: 'rd-product-7',
    name: 'Ghana Single Origin 75%',
    category: 'rd-category-4', // Single Origin Series
    description: 'Dark chocolate from single estate Ghana cocoa beans',
    unit: 'bars',
    minOrder: 8,
    price: 7.99,
    showPrice: true,
    showDescription: true,
    showUnit: true,
    showMinOrder: true,
    developmentDate: '2024-12-10',
    targetProductionDate: '2025-04-01',
    status: 'development',
    notes: 'Experimenting with different roasting profiles to highlight fruity notes.',
    imageUrls: [
      'https://images.unsplash.com/photo-1589750602846-60c8c5ea3e56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8ZGFyayUyMGNob2NvbGF0ZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60'
    ],
    costEstimate: 4.50,
    createdBy: 'admin',
    createdAt: '2024-12-10T12:00:00Z',
    updatedAt: '2025-01-05T09:30:00Z'
  }
];

// Load categories from storage
export function loadRDCategories(): RDCategory[] {
  try {
    const stored = localStorage.getItem(RD_CATEGORIES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with demo data if nothing is stored
    saveRDCategories(DEMO_RD_CATEGORIES);
    return DEMO_RD_CATEGORIES;
  } catch (error) {
    console.error('Error loading R&D categories:', error);
    return DEMO_RD_CATEGORIES;
  }
}

// Save categories to storage
export function saveRDCategories(categories: RDCategory[]): void {
  try {
    localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
    
    // Create log entry
    const currentUser = auth.currentUser;
    if (currentUser) {
      createLogEntry({
        userId: currentUser.uid,
        username: currentUser.email || 'unknown',
        action: 'Updated R&D Categories',
        category: 'feature',
        details: `Updated ${categories.length} R&D categories`
      }).catch(console.error);
    }
  } catch (error) {
    console.error('Error saving R&D categories:', error);
  }
}

// Load products from storage
export function loadRDProducts(): RDProduct[] {
  try {
    const stored = localStorage.getItem(RD_PRODUCTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with demo data if nothing is stored
    saveRDProducts(DEMO_RD_PRODUCTS);
    return DEMO_RD_PRODUCTS;
  } catch (error) {
    console.error('Error loading R&D products:', error);
    return DEMO_RD_PRODUCTS;
  }
}

// Save products to storage
export function saveRDProducts(products: RDProduct[]): void {
  try {
    localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
    
    // Create log entry
    const currentUser = auth.currentUser;
    if (currentUser) {
      createLogEntry({
        userId: currentUser.uid,
        username: currentUser.email || 'unknown',
        action: 'Updated R&D Products',
        category: 'feature',
        details: `Updated ${products.length} R&D products`
      }).catch(console.error);
    }
  } catch (error) {
    console.error('Error saving R&D products:', error);
  }
}

// Add a new category
export function addRDCategory(category: Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>): RDCategory {
  const now = new Date().toISOString();
  const newCategory = {
    ...category,
    id: `rd-category-${Date.now()}`,
    createdAt: now,
    updatedAt: now
  };
  
  const categories = loadRDCategories();
  const updatedCategories = [...categories, newCategory];
  saveRDCategories(updatedCategories);
  
  return newCategory;
}

// Update an existing category
export function updateRDCategory(id: string, categoryData: Partial<Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>>): RDCategory | null {
  const categories = loadRDCategories();
  const index = categories.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  const updatedCategory = {
    ...categories[index],
    ...categoryData,
    updatedAt: new Date().toISOString()
  };
  
  categories[index] = updatedCategory;
  saveRDCategories(categories);
  
  return updatedCategory;
}

// Delete a category
export function deleteRDCategory(id: string): boolean {
  const categories = loadRDCategories();
  const filteredCategories = categories.filter(c => c.id !== id);
  
  if (filteredCategories.length === categories.length) return false;
  
  saveRDCategories(filteredCategories);
  return true;
}

// Add a new product
export function addRDProduct(product: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): RDProduct {
  const currentUser = auth.currentUser;
  const now = new Date().toISOString();
  const newProduct = {
    ...product,
    id: `rd-product-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser?.email || 'unknown'
  };
  
  const products = loadRDProducts();
  const updatedProducts = [...products, newProduct];
  saveRDProducts(updatedProducts);
  
  return newProduct;
}

// Update an existing product
export function updateRDProduct(id: string, productData: Partial<Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): RDProduct | null {
  const products = loadRDProducts();
  const index = products.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  // Check if status is changing from planning to testing
  const oldStatus = products[index].status;
  const newStatus = productData.status || oldStatus;
  
  // Create an order for this product if status changing from planning to testing
  if (oldStatus === 'planning' && newStatus === 'testing') {
    createOrderFromRDProduct(products[index])
      .then(() => {
        console.log(`Created testing order for R&D product: ${products[index].name}`);
      })
      .catch(error => {
        console.error('Error creating testing order:', error);
      });
  }
  
  const updatedProduct = {
    ...products[index],
    ...productData,
    updatedAt: new Date().toISOString()
  };
  
  products[index] = updatedProduct;
  saveRDProducts(products);
  
  return updatedProduct;
}

// Create a production order from an R&D product
async function createOrderFromRDProduct(product: RDProduct): Promise<void> {
  try {
    // Create order delivery date (10 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 10);
    
    // Create order object - match the Order type structure
    const orderData = {
      branchId: 'production', // Use production branch
      orderedBy: product.createdBy || 'R&D Department',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate.toISOString().split('T')[0],
      poNumber: `RD-${product.id.slice(-5)}`,
      products: [
        {
          productId: product.id,
          quantity: product.minOrder || 1
        }
      ],
      notes: `R&D Testing Order: ${product.name}\n\nThis is an automatic order created when the product development status changed to Testing. Please produce this order for testing purposes.\n\n${product.notes || ''}`,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isRDProduct: true,
      rdProductData: product
    };

    // Add to Firestore orders collection
    await addDoc(collection(db, COLLECTIONS.ORDERS), orderData);
    
    // Create log entry
    const currentUser = auth.currentUser;
    if (currentUser) {
      createLogEntry({
        userId: currentUser.uid,
        username: currentUser.email || 'unknown',
        action: 'R&D Product Moved to Testing',
        category: 'feature',
        details: `Product "${product.name}" moved to testing phase. Created testing order.`
      }).catch(console.error);
    }
  } catch (error) {
    console.error('Error creating order from R&D product:', error);
    throw error;
  }
}

// Delete a product
export function deleteRDProduct(id: string): boolean {
  const products = loadRDProducts();
  const filteredProducts = products.filter(p => p.id !== id);
  
  if (filteredProducts.length === products.length) return false;
  
  saveRDProducts(filteredProducts);
  return true;
}

// Get products by category
export function getRDProductsByCategory(categoryId: string): RDProduct[] {
  const products = loadRDProducts();
  return products.filter(p => p.category === categoryId);
}

// Schedule a product for production
export function scheduleRDProductForProduction(id: string, targetDate: string): RDProduct | null {
  return updateRDProduct(id, { targetProductionDate: targetDate });
}

// Get R&D products scheduled for production
export function getScheduledRDProducts(): RDProduct[] {
  const products = loadRDProducts();
  return products.filter(p => p.targetProductionDate && p.status !== 'approved');
}

// Move RD product to production system
export function moveRDProductToProduction(id: string): RDProduct | null {
  // This function is now handled in the UI component that can directly use
  // the Store context to add products and recipes
  
  // Mark the R&D product as moved to production
  return updateRDProduct(id, { 
    status: 'approved',
    updatedAt: new Date().toISOString()
  });
}

// Dispatch a global event when R&D data changes
export function dispatchRDDataChangedEvent(): void {
  window.dispatchEvent(new CustomEvent('rd-data-changed'));
}

// Add listeners for the RD data changed event
export function addRDDataChangeListener(callback: () => void): () => void {
  const handler = () => {
    callback();
  };
  window.addEventListener('rd-data-changed', handler);
  return () => window.removeEventListener('rd-data-changed', handler);
}