import { RDCategory, RDProduct } from '../types/rd-types';
import { createLogEntry } from '../lib/firebase';
import { auth, db, COLLECTIONS } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// Storage keys for localStorage
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

// Check if COLLECTIONS includes R&D collections
if (!COLLECTIONS.RD_CATEGORIES) {
  COLLECTIONS.RD_CATEGORIES = 'rd_categories';
}
if (!COLLECTIONS.RD_PRODUCTS) {
  COLLECTIONS.RD_PRODUCTS = 'rd_products';
}

/**
 * Local Storage Implementations - Used when Firestore access fails
 */

// Save categories to localStorage (used as fallback)
function saveLocalRDCategories(categories: RDCategory[]): void {
  try {
    localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
    console.log('Saved categories to localStorage');
  } catch (error) {
    console.error('Error saving R&D categories to localStorage:', error);
  }
}

// Save products to localStorage (used as fallback)
function saveLocalRDProducts(products: RDProduct[]): void {
  try {
    localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
    console.log('Saved products to localStorage');
  } catch (error) {
    console.error('Error saving R&D products to localStorage:', error);
  }
}

// Load categories from localStorage
function loadLocalRDCategories(): RDCategory[] {
  try {
    const stored = localStorage.getItem(RD_CATEGORIES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading R&D categories from localStorage:', error);
  }
  
  // If nothing in localStorage, return demo data
  console.log('No categories in localStorage, using demo data');
  return DEMO_RD_CATEGORIES;
}

// Load products from localStorage
function loadLocalRDProducts(): RDProduct[] {
  try {
    const stored = localStorage.getItem(RD_PRODUCTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading R&D products from localStorage:', error);
  }
  
  // If nothing in localStorage, return demo data
  console.log('No products in localStorage, using demo data');
  return DEMO_RD_PRODUCTS;
}

// Initialize R&D data in localStorage if not already there
export function initializeLocalStorage(): void {
  try {
    // Check if localStorage already has data
    const hasCategories = localStorage.getItem(RD_CATEGORIES_KEY);
    const hasProducts = localStorage.getItem(RD_PRODUCTS_KEY);
    
    // Initialize categories if needed
    if (!hasCategories) {
      localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(DEMO_RD_CATEGORIES));
    }
    
    // Initialize products if needed
    if (!hasProducts) {
      localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(DEMO_RD_PRODUCTS));
    }
    
    console.log('LocalStorage initialized for R&D data');
  } catch (error) {
    console.error('Error initializing localStorage for R&D data:', error);
  }
}

/**
 * Main API functions - Try Firestore first, fallback to localStorage if needed
 */

// Load categories - try Firestore first, fallback to localStorage
export async function loadRDCategories(): Promise<RDCategory[]> {
  try {
    // Try to load from Firestore first
    const q = query(
      collection(db, COLLECTIONS.RD_CATEGORIES),
      orderBy('name')
    );
    
    try {
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const categories: RDCategory[] = [];
        snapshot.forEach(doc => {
          categories.push({
            ...doc.data(),
            id: doc.id
          } as RDCategory);
        });
        console.log(`Loaded ${categories.length} categories from Firestore`);
        return categories;
      }
    } catch (firestoreError) {
      console.error('Firestore error, falling back to localStorage:', firestoreError);
      // Continue to localStorage fallback
    }
    
    // If Firestore failed or was empty, use localStorage
    console.log('Using localStorage for categories');
    return loadLocalRDCategories();
  } catch (error) {
    console.error('Error in loadRDCategories, using demo data:', error);
    return DEMO_RD_CATEGORIES;
  }
}

// Load products - try Firestore first, fallback to localStorage
export async function loadRDProducts(): Promise<RDProduct[]> {
  try {
    // Try to load from Firestore first
    const q = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      orderBy('name')
    );
    
    try {
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const products: RDProduct[] = [];
        snapshot.forEach(doc => {
          products.push({
            ...doc.data(),
            id: doc.id
          } as RDProduct);
        });
        console.log(`Loaded ${products.length} products from Firestore`);
        return products;
      }
    } catch (firestoreError) {
      console.error('Firestore error, falling back to localStorage:', firestoreError);
      // Continue to localStorage fallback
    }
    
    // If Firestore failed or was empty, use localStorage
    console.log('Using localStorage for products');
    return loadLocalRDProducts();
  } catch (error) {
    console.error('Error in loadRDProducts, using demo data:', error);
    return DEMO_RD_PRODUCTS;
  }
}

// Add a new category
export async function addRDCategory(category: Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<RDCategory> {
  try {
    const now = new Date().toISOString();
    const newCategory = {
      ...category,
      id: `rd-category-${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    
    // Try to add to Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.RD_CATEGORIES, newCategory.id), {
        ...newCategory,
        createdAt: now,
        updatedAt: serverTimestamp()
      });
      console.log('Category added to Firestore:', newCategory.name);
    } catch (firestoreError) {
      console.error('Firestore error when adding category, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    const categories = await loadRDCategories();
    const updatedCategories = [...categories, newCategory];
    saveLocalRDCategories(updatedCategories);
    
    // Create log entry if possible
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Added R&D Category',
          category: 'feature',
          details: `Added R&D category: ${newCategory.name}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return newCategory;
  } catch (error) {
    console.error('Error adding R&D category:', error);
    throw error;
  }
}

// Update an existing category
export async function updateRDCategory(id: string, categoryData: Partial<Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RDCategory | null> {
  try {
    // Get all categories to find the one to update
    const categories = await loadRDCategories();
    const existingCategoryIndex = categories.findIndex(c => c.id === id);
    
    if (existingCategoryIndex === -1) {
      throw new Error(`Category with id ${id} not found`);
    }
    
    const existingCategory = categories[existingCategoryIndex];
    const updatedCategory = {
      ...existingCategory,
      ...categoryData,
      updatedAt: new Date().toISOString()
    };
    
    // Try to update in Firestore
    try {
      const categoryRef = doc(db, COLLECTIONS.RD_CATEGORIES, id);
      await updateDoc(categoryRef, {
        ...categoryData,
        updatedAt: serverTimestamp()
      });
      console.log('Category updated in Firestore:', updatedCategory.name);
    } catch (firestoreError) {
      console.error('Firestore error when updating category, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    categories[existingCategoryIndex] = updatedCategory;
    saveLocalRDCategories(categories);
    
    // Create log entry if possible
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Updated R&D Category',
          category: 'feature',
          details: `Updated R&D category: ${updatedCategory.name}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return updatedCategory;
  } catch (error) {
    console.error('Error updating R&D category:', error);
    throw error;
  }
}

// Delete a category
export async function deleteRDCategory(id: string): Promise<boolean> {
  try {
    // Try to delete from Firestore
    try {
      await deleteDoc(doc(db, COLLECTIONS.RD_CATEGORIES, id));
      console.log('Category deleted from Firestore:', id);
    } catch (firestoreError) {
      console.error('Firestore error when deleting category, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    const categories = await loadRDCategories();
    const filteredCategories = categories.filter(c => c.id !== id);
    saveLocalRDCategories(filteredCategories);
    
    // Create log entry if possible
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Deleted R&D Category',
          category: 'feature',
          details: `Deleted R&D category: ${id}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return true;
  } catch (error) {
    console.error('Error deleting R&D category:', error);
    throw error;
  }
}

// Add a new product
export async function addRDProduct(product: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<RDProduct> {
  try {
    const currentUser = auth.currentUser;
    const now = new Date().toISOString();
    const newProduct = {
      ...product,
      id: `rd-product-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.email || 'unknown'
    };
    
    // Try to add to Firestore
    try {
      await setDoc(doc(db, COLLECTIONS.RD_PRODUCTS, newProduct.id), {
        ...newProduct,
        createdAt: now,
        updatedAt: serverTimestamp()
      });
      console.log('Product added to Firestore:', newProduct.name);
    } catch (firestoreError) {
      console.error('Firestore error when adding product, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    const products = await loadRDProducts();
    const updatedProducts = [...products, newProduct];
    saveLocalRDProducts(updatedProducts);
    
    // Create log entry if possible
    try {
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Added R&D Product',
          category: 'feature',
          details: `Added R&D product: ${newProduct.name}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return newProduct;
  } catch (error) {
    console.error('Error adding R&D product:', error);
    throw error;
  }
}

// Update an existing product
export async function updateRDProduct(id: string, productData: Partial<Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<RDProduct | null> {
  try {
    // Get all products to find the one to update
    const products = await loadRDProducts();
    const existingProductIndex = products.findIndex(p => p.id === id);
    
    if (existingProductIndex === -1) {
      throw new Error(`Product with id ${id} not found`);
    }
    
    const existingProduct = products[existingProductIndex];
    const updatedProduct = {
      ...existingProduct,
      ...productData,
      updatedAt: new Date().toISOString()
    };
    
    // Try to update in Firestore
    try {
      const productRef = doc(db, COLLECTIONS.RD_PRODUCTS, id);
      await updateDoc(productRef, {
        ...productData,
        updatedAt: serverTimestamp()
      });
      console.log('Product updated in Firestore:', updatedProduct.name);
    } catch (firestoreError) {
      console.error('Firestore error when updating product, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    products[existingProductIndex] = updatedProduct;
    saveLocalRDProducts(products);
    
    // Create log entry if possible
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Updated R&D Product',
          category: 'feature',
          details: `Updated R&D product: ${updatedProduct.name}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return updatedProduct;
  } catch (error) {
    console.error('Error updating R&D product:', error);
    throw error;
  }
}

// Delete a product
export async function deleteRDProduct(id: string): Promise<boolean> {
  try {
    // Try to delete from Firestore
    try {
      await deleteDoc(doc(db, COLLECTIONS.RD_PRODUCTS, id));
      console.log('Product deleted from Firestore:', id);
    } catch (firestoreError) {
      console.error('Firestore error when deleting product, using localStorage only:', firestoreError);
    }
    
    // Always update localStorage as backup
    const products = await loadRDProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    saveLocalRDProducts(filteredProducts);
    
    // Create log entry if possible
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createLogEntry({
          userId: currentUser.uid,
          username: currentUser.email || 'unknown',
          action: 'Deleted R&D Product',
          category: 'feature',
          details: `Deleted R&D product: ${id}`
        });
      }
    } catch (logError) {
      console.error('Error creating log entry:', logError);
      // Continue without creating log
    }
    
    dispatchRDDataChangedEvent();
    return true;
  } catch (error) {
    console.error('Error deleting R&D product:', error);
    throw error;
  }
}

// Get products by category
export async function getRDProductsByCategory(categoryId: string): Promise<RDProduct[]> {
  try {
    // Try Firestore first
    try {
      const q = query(
        collection(db, COLLECTIONS.RD_PRODUCTS),
        where('category', '==', categoryId),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      const products: RDProduct[] = [];
      
      snapshot.forEach(doc => {
        products.push({
          ...doc.data(),
          id: doc.id
        } as RDProduct);
      });
      
      console.log(`Loaded ${products.length} products for category ${categoryId} from Firestore`);
      return products;
    } catch (firestoreError) {
      console.error('Firestore error loading products by category, using localStorage:', firestoreError);
    }
    
    // Fallback to localStorage
    const products = loadLocalRDProducts();
    return products.filter(p => p.category === categoryId);
  } catch (error) {
    console.error('Error in getRDProductsByCategory:', error);
    // Return empty array as fallback
    return [];
  }
}

// Schedule a product for production
export async function scheduleRDProductForProduction(id: string, targetDate: string): Promise<RDProduct | null> {
  return updateRDProduct(id, { targetProductionDate: targetDate });
}

// Get R&D products scheduled for production
export async function getScheduledRDProducts(): Promise<RDProduct[]> {
  try {
    // Try Firestore first
    try {
      const q = query(
        collection(db, COLLECTIONS.RD_PRODUCTS),
        where('targetProductionDate', '!=', null),
        where('status', '!=', 'approved')
      );
      
      const snapshot = await getDocs(q);
      const products: RDProduct[] = [];
      
      snapshot.forEach(doc => {
        products.push({
          ...doc.data(),
          id: doc.id
        } as RDProduct);
      });
      
      console.log(`Loaded ${products.length} scheduled products from Firestore`);
      return products;
    } catch (firestoreError) {
      console.error('Firestore error loading scheduled products, using localStorage:', firestoreError);
    }
    
    // Fallback to localStorage
    const products = loadLocalRDProducts();
    return products.filter(p => p.targetProductionDate && p.status !== 'approved');
  } catch (error) {
    console.error('Error in getScheduledRDProducts:', error);
    return [];
  }
}

// Move RD product to production system
export async function moveRDProductToProduction(id: string): Promise<RDProduct | null> {
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

// Initialize R&D data
export async function initializeRDData(): Promise<void> {
  console.log('Initializing R&D data...');
  
  try {
    // Initialize localStorage first (this always works)
    initializeLocalStorage();
    
    // Try to access Firestore to check permissions
    try {
      const testRef = doc(db, COLLECTIONS.RD_CATEGORIES, 'test-permissions');
      await getDoc(testRef); // This will throw if permissions are insufficient
      
      console.log('Firestore access verified, checking if collections need initialization...');
      
      // Check if Firestore has data
      const categoriesQuery = query(collection(db, COLLECTIONS.RD_CATEGORIES));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      
      const productsQuery = query(collection(db, COLLECTIONS.RD_PRODUCTS));
      const productsSnapshot = await getDocs(productsQuery);
      
      // If Firestore collections are empty, populate them from localStorage
      if (categoriesSnapshot.empty) {
        console.log('Initializing Firestore RD_CATEGORIES collection...');
        const localCategories = loadLocalRDCategories();
        
        for (const category of localCategories) {
          await setDoc(doc(db, COLLECTIONS.RD_CATEGORIES, category.id), {
            ...category,
            updatedAt: serverTimestamp()
          });
        }
        console.log(`${localCategories.length} categories added to Firestore`);
      }
      
      if (productsSnapshot.empty) {
        console.log('Initializing Firestore RD_PRODUCTS collection...');
        const localProducts = loadLocalRDProducts();
        
        for (const product of localProducts) {
          await setDoc(doc(db, COLLECTIONS.RD_PRODUCTS, product.id), {
            ...product,
            updatedAt: serverTimestamp()
          });
        }
        console.log(`${localProducts.length} products added to Firestore`);
      }
    } catch (firestoreError) {
      console.warn('Firestore access failed, using localStorage only:', firestoreError);
      // Continue with localStorage only
    }
    
    console.log('R&D data initialized successfully');
  } catch (error) {
    console.error('Error initializing R&D data:', error);
    throw error;
  }
}