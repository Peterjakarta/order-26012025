import { RDCategory, RDProduct } from '../types/rd-types';
import { createLogEntry, db, COLLECTIONS, ensureCollectionExists } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { 
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  limit
} from 'firebase/firestore';

// Storage keys for backward compatibility
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

// Keep track of listeners to avoid duplicates
let categoriesListener: (() => void) | null = null;
let productsListener: (() => void) | null = null;

// Utility function to sanitize data for Firestore
// This will replace undefined values with null and remove functions
export function sanitizeForFirestore(data: any): any {
  if (data === undefined) {
    return null;
  }
  
  if (data === null || typeof data !== 'object' || data instanceof Date) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip functions and undefined values
    if (typeof value !== 'function' && value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    } else if (value === undefined) {
      // Convert undefined to null for Firestore
      result[key] = null;
    }
  }
  
  return result;
}

// Initialize Firestore collections with demo data if needed
export async function initializeRDCollections() {
  try {
    console.log('Initializing R&D collections...');
    
    // Initialize RD_CATEGORIES collection with demo data if empty
    const categoriesExist = await ensureCollectionExists(COLLECTIONS.RD_CATEGORIES, DEMO_RD_CATEGORIES);
    console.log(`RD_CATEGORIES collection ${categoriesExist ? 'already exists' : 'was initialized'}`);
    
    // Initialize RD_PRODUCTS collection with demo data if empty
    const productsExist = await ensureCollectionExists(COLLECTIONS.RD_PRODUCTS, DEMO_RD_PRODUCTS);
    console.log(`RD_PRODUCTS collection ${productsExist ? 'already exists' : 'was initialized'}`);
    
    // Migrate any localStorage data if it exists
    await migrateLocalStorageData();
    
    return { categoriesExist, productsExist };
  } catch (error) {
    console.error('Error initializing RD collections:', error);
    throw error;
  }
}

// Migrate localStorage data to Firestore
async function migrateLocalStorageData() {
  try {
    // Migrate categories from localStorage
    const storedCategories = localStorage.getItem(RD_CATEGORIES_KEY);
    if (storedCategories) {
      const categories = JSON.parse(storedCategories) as RDCategory[];
      if (categories && categories.length > 0) {
        console.log(`Migrating ${categories.length} categories from localStorage to Firestore`);
        const batch = writeBatch(db);
        
        for (const category of categories) {
          const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, category.id);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            batch.set(docRef, {
              ...category,
              createdAt: new Date(category.createdAt),
              updatedAt: new Date(category.updatedAt)
            });
          }
        }
        
        await batch.commit();
        console.log('Categories migration completed');
        localStorage.removeItem(RD_CATEGORIES_KEY);
      }
    }
    
    // Migrate products from localStorage
    const storedProducts = localStorage.getItem(RD_PRODUCTS_KEY);
    if (storedProducts) {
      const products = JSON.parse(storedProducts) as RDProduct[];
      if (products && products.length > 0) {
        console.log(`Migrating ${products.length} products from localStorage to Firestore`);
        const batch = writeBatch(db);
        
        for (const product of products) {
          const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, product.id);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // Sanitize product data before saving
            const sanitizedProduct = sanitizeForFirestore(product);
            batch.set(docRef, {
              ...sanitizedProduct,
              createdAt: new Date(product.createdAt),
              updatedAt: new Date(product.updatedAt)
            });
          }
        }
        
        await batch.commit();
        console.log('Products migration completed');
        localStorage.removeItem(RD_PRODUCTS_KEY);
      }
    }
  } catch (error) {
    console.error('Error migrating localStorage data:', error);
  }
}

// Create and set up Firestore listeners for RD collections
export function setupRDDataListeners(
  onCategoriesUpdate: (categories: RDCategory[]) => void,
  onProductsUpdate: (products: RDProduct[]) => void
) {
  console.log('Setting up R&D data listeners...');
  
  // Clean up previous listeners if they exist
  if (categoriesListener) {
    categoriesListener();
    categoriesListener = null;
  }
  
  if (productsListener) {
    productsListener();
    productsListener = null;
  }
  
  try {
    // Set up listener for categories
    const categoriesQuery = query(
      collection(db, COLLECTIONS.RD_CATEGORIES),
      orderBy('name')
    );
    
    categoriesListener = onSnapshot(categoriesQuery, (snapshot) => {
      console.log(`Received ${snapshot.docs.length} categories from Firestore`);
      
      const categories: RDCategory[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString()
        } as RDCategory;
      });
      
      onCategoriesUpdate(categories);
    }, (error) => {
      console.error('Error in categories listener:', error);
    });
    
    // Set up listener for products
    const productsQuery = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      orderBy('updatedAt', 'desc')
    );
    
    productsListener = onSnapshot(productsQuery, (snapshot) => {
      console.log(`Received ${snapshot.docs.length} products from Firestore`);
      
      const products: RDProduct[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          developmentDate: data.developmentDate || new Date().toISOString().split('T')[0],
          targetProductionDate: data.targetProductionDate || null
        } as RDProduct;
      });
      
      onProductsUpdate(products);
    }, (error) => {
      console.error('Error in products listener:', error);
    });
    
    return {
      cleanup: () => {
        if (categoriesListener) categoriesListener();
        if (productsListener) productsListener();
      }
    };
  } catch (error) {
    console.error('Error setting up RD data listeners:', error);
    throw error;
  }
}

// Load categories from Firestore with fallback
export async function loadRDCategories(): Promise<RDCategory[]> {
  try {
    console.log('Loading R&D categories from Firestore...');
    
    // Ensure collections are initialized
    await initializeRDCollections();
    
    // Query categories from Firestore
    const categoriesQuery = query(
      collection(db, COLLECTIONS.RD_CATEGORIES),
      orderBy('name')
    );
    
    const snapshot = await getDocs(categoriesQuery);
    console.log(`Loaded ${snapshot.docs.length} categories from Firestore`);
    
    if (snapshot.empty) {
      console.log('No categories found in Firestore, returning demo data');
      return DEMO_RD_CATEGORIES;
    }
    
    const categories: RDCategory[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString()
      } as RDCategory;
    });
    
    return categories;
  } catch (error) {
    console.error('Error loading R&D categories:', error);
    
    // Fallback to localStorage in case of error
    const stored = localStorage.getItem(RD_CATEGORIES_KEY);
    if (stored) {
      console.log('Falling back to localStorage for categories');
      return JSON.parse(stored);
    }
    
    console.log('No localStorage fallback, returning demo data');
    return DEMO_RD_CATEGORIES;
  }
}

// Save categories to Firestore
export async function saveRDCategories(categories: RDCategory[]): Promise<void> {
  try {
    console.log(`Saving ${categories.length} R&D categories to Firestore...`);
    
    // Use batch to update multiple documents
    const batch = writeBatch(db);
    
    // Update all categories in the batch
    for (const category of categories) {
      const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, category.id);
      // Sanitize category data before saving
      const sanitizedCategory = sanitizeForFirestore(category);
      batch.set(docRef, {
        ...sanitizedCategory,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    console.log('Categories saved to Firestore successfully');
    
    // Update localStorage as backup
    localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Updated R&D Categories',
        category: 'feature',
        details: `Updated ${categories.length} R&D categories`
      });
    }
  } catch (error) {
    console.error('Error saving R&D categories:', error);
    
    // Still update localStorage as fallback
    localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
    
    throw error;
  }
}

// Load products from Firestore with fallback
export async function loadRDProducts(): Promise<RDProduct[]> {
  try {
    console.log('Loading R&D products from Firestore...');
    
    // Ensure collections are initialized
    await initializeRDCollections();
    
    // Query products from Firestore
    const productsQuery = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(productsQuery);
    console.log(`Loaded ${snapshot.docs.length} products from Firestore`);
    
    if (snapshot.empty) {
      console.log('No products found in Firestore, returning demo data');
      return DEMO_RD_PRODUCTS;
    }
    
    const products: RDProduct[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        developmentDate: data.developmentDate || new Date().toISOString().split('T')[0],
        targetProductionDate: data.targetProductionDate || null
      } as RDProduct;
    });
    
    return products;
  } catch (error) {
    console.error('Error loading R&D products:', error);
    
    // Fallback to localStorage in case of error
    const stored = localStorage.getItem(RD_PRODUCTS_KEY);
    if (stored) {
      console.log('Falling back to localStorage for products');
      return JSON.parse(stored);
    }
    
    console.log('No localStorage fallback, returning demo data');
    return DEMO_RD_PRODUCTS;
  }
}

// Save products to Firestore
export async function saveRDProducts(products: RDProduct[]): Promise<void> {
  try {
    console.log(`Saving ${products.length} R&D products to Firestore...`);
    
    // Use batch to update multiple documents
    const batch = writeBatch(db);
    
    // Update all products in the batch
    for (const product of products) {
      const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, product.id);
      // Sanitize product data before saving to remove undefined values
      const sanitizedProduct = sanitizeForFirestore(product);
      batch.set(docRef, {
        ...sanitizedProduct,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(),
        // Handle dates correctly
        developmentDate: product.developmentDate,
        targetProductionDate: product.targetProductionDate || null
      });
    }
    
    await batch.commit();
    console.log('Products saved to Firestore successfully');
    
    // Update localStorage as backup
    localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Updated R&D Products',
        category: 'feature',
        details: `Updated ${products.length} R&D products`
      });
    }
  } catch (error) {
    console.error('Error saving R&D products:', error);
    
    // Still update localStorage as fallback
    localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
    
    throw error;
  }
}

// Add a new category
export async function addRDCategory(category: Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<RDCategory> {
  try {
    console.log('Adding new R&D category:', category.name);
    
    const now = new Date();
    const newCategory: RDCategory = {
      ...category,
      id: `rd-category-${Date.now()}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    
    // Sanitize category data
    const sanitizedCategory = sanitizeForFirestore(newCategory);
    
    // Save to Firestore
    const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, newCategory.id);
    await setDoc(docRef, {
      ...sanitizedCategory,
      createdAt: now,
      updatedAt: now
    });
    
    console.log('Category added successfully, ID:', newCategory.id);
    
    // Also update localStorage for backup
    try {
      const existingCategories = localStorage.getItem(RD_CATEGORIES_KEY);
      const categories = existingCategories ? JSON.parse(existingCategories) : [];
      categories.push(newCategory);
      localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (err) {
      console.warn('Failed to update localStorage with new category');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Created R&D Category',
        category: 'feature',
        details: `Created category: ${newCategory.name}`
      });
    }
    
    return newCategory;
  } catch (error) {
    console.error('Error adding R&D category:', error);
    throw error;
  }
}

// Update an existing category
export async function updateRDCategory(id: string, categoryData: Partial<Omit<RDCategory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RDCategory | null> {
  try {
    console.log('Updating R&D category:', id);
    
    // Get current category data
    const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Category not found in Firestore:', id);
      return null;
    }
    
    const existingData = docSnap.data();
    const now = new Date();
    
    // Sanitize category data
    const sanitizedData = sanitizeForFirestore(categoryData);
    
    // Update in Firestore
    await updateDoc(docRef, {
      ...sanitizedData,
      updatedAt: now
    });
    
    // Construct the updated category
    const updatedCategory: RDCategory = {
      ...existingData,
      ...categoryData,
      id,
      createdAt: existingData.createdAt?.toDate?.().toISOString() || now.toISOString(),
      updatedAt: now.toISOString()
    } as RDCategory;
    
    console.log('Category updated successfully');
    
    // Also update localStorage for backup
    try {
      const existingCategories = localStorage.getItem(RD_CATEGORIES_KEY);
      if (existingCategories) {
        const categories = JSON.parse(existingCategories) as RDCategory[];
        const index = categories.findIndex(c => c.id === id);
        if (index !== -1) {
          categories[index] = updatedCategory;
          localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(categories));
        }
      }
    } catch (err) {
      console.warn('Failed to update localStorage with updated category');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Updated R&D Category',
        category: 'feature',
        details: `Updated category: ${updatedCategory.name}`
      });
    }
    
    return updatedCategory;
  } catch (error) {
    console.error('Error updating R&D category:', error);
    throw error;
  }
}

// Delete a category
export async function deleteRDCategory(id: string): Promise<boolean> {
  try {
    console.log('Deleting R&D category:', id);
    
    // Delete from Firestore
    const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, id);
    await deleteDoc(docRef);
    
    console.log('Category deleted successfully');
    
    // Also update localStorage for backup
    try {
      const existingCategories = localStorage.getItem(RD_CATEGORIES_KEY);
      if (existingCategories) {
        const categories = JSON.parse(existingCategories) as RDCategory[];
        const filteredCategories = categories.filter(c => c.id !== id);
        localStorage.setItem(RD_CATEGORIES_KEY, JSON.stringify(filteredCategories));
      }
    } catch (err) {
      console.warn('Failed to update localStorage after category deletion');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Deleted R&D Category',
        category: 'feature',
        details: `Deleted category ID: ${id}`
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting R&D category:', error);
    throw error;
  }
}

// Add a new product
export async function addRDProduct(product: Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<RDProduct> {
  try {
    console.log('Adding new R&D product:', product.name);
    
    const now = new Date();
    const newProduct: RDProduct = {
      ...product,
      id: `rd-product-${Date.now()}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: auth.currentUser?.email || 'unknown'
    };
    
    // Sanitize product data to replace undefined values with null for Firestore
    const sanitizedProduct = sanitizeForFirestore(newProduct);
    
    // Save to Firestore
    const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, newProduct.id);
    await setDoc(docRef, {
      ...sanitizedProduct,
      createdAt: now,
      updatedAt: now,
      developmentDate: product.developmentDate,
      targetProductionDate: product.targetProductionDate || null
    });
    
    console.log('Product added successfully, ID:', newProduct.id);
    
    // Also update localStorage for backup
    try {
      const existingProducts = localStorage.getItem(RD_PRODUCTS_KEY);
      const products = existingProducts ? JSON.parse(existingProducts) : [];
      products.push(newProduct);
      localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
    } catch (err) {
      console.warn('Failed to update localStorage with new product');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Created R&D Product',
        category: 'feature',
        details: `Created product: ${newProduct.name}`
      });
    }
    
    return newProduct;
  } catch (error) {
    console.error('Error adding R&D product:', error);
    throw error;
  }
}

// Update an existing product
export async function updateRDProduct(id: string, productData: Partial<Omit<RDProduct, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<RDProduct | null> {
  try {
    console.log('Updating R&D product:', id);
    
    // Get current product data
    const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log('Product not found in Firestore:', id);
      return null;
    }
    
    const existingData = docSnap.data();
    const now = new Date();
    
    // Sanitize product data to replace undefined values with null
    const sanitizedData = sanitizeForFirestore(productData);
    
    // Prepare data for update
    const updates = {
      ...sanitizedData,
      updatedAt: now
    };
    
    // Update in Firestore
    await updateDoc(docRef, updates);
    
    // Construct the updated product
    const updatedProduct: RDProduct = {
      ...existingData,
      ...productData,
      id,
      createdAt: existingData.createdAt?.toDate?.().toISOString() || existingData.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: existingData.createdBy || auth.currentUser?.email || 'unknown'
    } as RDProduct;
    
    console.log('Product updated successfully');
    
    // Also update localStorage for backup
    try {
      const existingProducts = localStorage.getItem(RD_PRODUCTS_KEY);
      if (existingProducts) {
        const products = JSON.parse(existingProducts) as RDProduct[];
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
          products[index] = updatedProduct;
          localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(products));
        }
      }
    } catch (err) {
      console.warn('Failed to update localStorage with updated product');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Updated R&D Product',
        category: 'feature',
        details: `Updated product: ${updatedProduct.name}`
      });
    }
    
    return updatedProduct;
  } catch (error) {
    console.error('Error updating R&D product:', error);
    throw error;
  }
}

// Delete a product
export async function deleteRDProduct(id: string): Promise<boolean> {
  try {
    console.log('Deleting R&D product:', id);
    
    // Delete from Firestore
    const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, id);
    await deleteDoc(docRef);
    
    console.log('Product deleted successfully');
    
    // Also update localStorage for backup
    try {
      const existingProducts = localStorage.getItem(RD_PRODUCTS_KEY);
      if (existingProducts) {
        const products = JSON.parse(existingProducts) as RDProduct[];
        const filteredProducts = products.filter(p => p.id !== id);
        localStorage.setItem(RD_PRODUCTS_KEY, JSON.stringify(filteredProducts));
      }
    } catch (err) {
      console.warn('Failed to update localStorage after product deletion');
    }
    
    // Create log entry
    if (auth.currentUser) {
      await createLogEntry({
        userId: auth.currentUser.uid,
        username: auth.currentUser.email || 'unknown',
        action: 'Deleted R&D Product',
        category: 'feature',
        details: `Deleted product ID: ${id}`
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting R&D product:', error);
    throw error;
  }
}

// Get products by category
export async function getRDProductsByCategory(categoryId: string): Promise<RDProduct[]> {
  try {
    console.log('Getting R&D products by category:', categoryId);
    
    const q = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      where('category', '==', categoryId),
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.docs.length} products in category ${categoryId}`);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        developmentDate: data.developmentDate || new Date().toISOString().split('T')[0],
        targetProductionDate: data.targetProductionDate || null
      } as RDProduct;
    });
  } catch (error) {
    console.error('Error getting R&D products by category:', error);
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(RD_PRODUCTS_KEY);
      if (stored) {
        const products = JSON.parse(stored) as RDProduct[];
        return products.filter(p => p.category === categoryId);
      }
    } catch (err) {
      console.warn('Failed to get products from localStorage fallback');
    }
    
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
    console.log('Getting scheduled R&D products');
    
    const q = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      where('targetProductionDate', '!=', null)
    );
    
    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.docs.length} scheduled products`);
    
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          developmentDate: data.developmentDate || new Date().toISOString().split('T')[0],
          targetProductionDate: data.targetProductionDate
        } as RDProduct;
      })
      .filter(product => product.status !== 'approved');
  } catch (error) {
    console.error('Error getting scheduled R&D products:', error);
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(RD_PRODUCTS_KEY);
      if (stored) {
        const products = JSON.parse(stored) as RDProduct[];
        return products.filter(p => p.targetProductionDate && p.status !== 'approved');
      }
    } catch (err) {
      console.warn('Failed to get scheduled products from localStorage fallback');
    }
    
    return [];
  }
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