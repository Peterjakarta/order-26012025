import { RDCategory, RDProduct, TestResult } from '../types/rd-types';
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
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// Check if COLLECTIONS includes R&D collections
if (!COLLECTIONS.RD_CATEGORIES) {
  COLLECTIONS.RD_CATEGORIES = 'rd_categories';
}
if (!COLLECTIONS.RD_PRODUCTS) {
  COLLECTIONS.RD_PRODUCTS = 'rd_products';
}

// Sample data for initial collection seeding if needed
const SAMPLE_RD_CATEGORIES = [
  {
    id: 'rd-category-1',
    name: 'Experimental Truffles',
    description: 'New and innovative truffle flavors and designs',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rd-category-2',
    name: 'Sugar-Free Products',
    description: 'Chocolate products with no added sugars',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rd-category-3',
    name: 'Vegan Range',
    description: 'Plant-based chocolate products with no animal ingredients',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rd-category-4',
    name: 'Single Origin Series',
    description: 'Chocolates made from beans of specific regions',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const SAMPLE_RD_PRODUCTS = [
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
  }
];

/**
 * Firestore Data Access Functions
 */

// Load categories from Firestore
export async function loadRDCategories(): Promise<RDCategory[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.RD_CATEGORIES),
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If collection is empty, seed it with sample data
      console.log('RD Categories collection is empty. Seeding with sample data...');
      await seedInitialCategories();
      
      // Fetch again after seeding
      const newSnapshot = await getDocs(q);
      
      const categories: RDCategory[] = [];
      newSnapshot.forEach(doc => {
        categories.push({
          ...doc.data(),
          id: doc.id
        } as RDCategory);
      });
      
      return categories;
    }
    
    const categories: RDCategory[] = [];
    snapshot.forEach(doc => {
      categories.push({
        ...doc.data(),
        id: doc.id
      } as RDCategory);
    });
    
    return categories;
  } catch (error) {
    console.error('Error in loadRDCategories:', error);
    throw error;
  }
}

// Load products from Firestore
export async function loadRDProducts(): Promise<RDProduct[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.RD_PRODUCTS),
      orderBy('name')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If collection is empty, seed it with sample data
      console.log('RD Products collection is empty. Seeding with sample data...');
      await seedInitialProducts();
      
      // Fetch again after seeding
      const newSnapshot = await getDocs(q);
      
      const products: RDProduct[] = [];
      newSnapshot.forEach(doc => {
        products.push({
          ...doc.data(),
          id: doc.id
        } as RDProduct);
      });
      
      return products;
    }
    
    const products: RDProduct[] = [];
    snapshot.forEach(doc => {
      products.push({
        ...doc.data(),
        id: doc.id
      } as RDProduct);
    });
    
    return products;
  } catch (error) {
    console.error('Error in loadRDProducts:', error);
    throw error;
  }
}

// Seed initial categories to Firestore
async function seedInitialCategories(): Promise<void> {
  try {
    const batch = db.batch ? db.batch() : null;
    
    if (!batch) {
      // Use individual writes if batching is not available
      for (const category of SAMPLE_RD_CATEGORIES) {
        await setDoc(doc(db, COLLECTIONS.RD_CATEGORIES, category.id), {
          ...category,
          createdAt: category.createdAt,
          updatedAt: serverTimestamp()
        });
      }
    } else {
      // Use batching for efficiency
      for (const category of SAMPLE_RD_CATEGORIES) {
        const docRef = doc(db, COLLECTIONS.RD_CATEGORIES, category.id);
        batch.set(docRef, {
          ...category,
          createdAt: category.createdAt,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
    }
    
    console.log('Successfully seeded RD categories.');
  } catch (error) {
    console.error('Error seeding initial categories:', error);
    throw error;
  }
}

// Seed initial products to Firestore
async function seedInitialProducts(): Promise<void> {
  try {
    const batch = db.batch ? db.batch() : null;
    
    if (!batch) {
      // Use individual writes if batching is not available
      for (const product of SAMPLE_RD_PRODUCTS) {
        await setDoc(doc(db, COLLECTIONS.RD_PRODUCTS, product.id), {
          ...product,
          createdAt: product.createdAt,
          updatedAt: serverTimestamp()
        });
      }
    } else {
      // Use batching for efficiency
      for (const product of SAMPLE_RD_PRODUCTS) {
        const docRef = doc(db, COLLECTIONS.RD_PRODUCTS, product.id);
        batch.set(docRef, {
          ...product,
          createdAt: product.createdAt,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
    }
    
    console.log('Successfully seeded RD products.');
  } catch (error) {
    console.error('Error seeding initial products:', error);
    throw error;
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
    
    await setDoc(doc(db, COLLECTIONS.RD_CATEGORIES, newCategory.id), {
      ...newCategory,
      updatedAt: serverTimestamp()
    });
    
    // Create log entry
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
    // Get the current category data
    const categoryRef = doc(db, COLLECTIONS.RD_CATEGORIES, id);
    const categoryDoc = await getDoc(categoryRef);
    
    if (!categoryDoc.exists()) {
      throw new Error(`Category with id ${id} not found`);
    }
    
    const existingCategory = categoryDoc.data() as RDCategory;
    const updatedCategory = {
      ...existingCategory,
      ...categoryData,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: serverTimestamp()
    });
    
    // Create log entry
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
    await deleteDoc(doc(db, COLLECTIONS.RD_CATEGORIES, id));
    
    // Create log entry
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
    
    await setDoc(doc(db, COLLECTIONS.RD_PRODUCTS, newProduct.id), {
      ...newProduct,
      updatedAt: serverTimestamp()
    });
    
    // Create log entry
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
    // Get the current product data
    const productRef = doc(db, COLLECTIONS.RD_PRODUCTS, id);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error(`Product with id ${id} not found`);
    }
    
    const existingProduct = productDoc.data() as RDProduct;
    const updatedProduct = {
      ...existingProduct,
      ...productData,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(productRef, {
      ...productData,
      updatedAt: serverTimestamp()
    });
    
    // Create log entry
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
    await deleteDoc(doc(db, COLLECTIONS.RD_PRODUCTS, id));
    
    // Create log entry
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
    
    return products;
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
    
    return products;
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
    // Check if Firestore collections exist and have data
    // If not, seed with sample data
    const categoriesQuery = query(collection(db, COLLECTIONS.RD_CATEGORIES));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    const productsQuery = query(collection(db, COLLECTIONS.RD_PRODUCTS));
    const productsSnapshot = await getDocs(productsQuery);
    
    // If collections are empty, seed them
    if (categoriesSnapshot.empty) {
      await seedInitialCategories();
    }
    
    if (productsSnapshot.empty) {
      await seedInitialProducts();
    }
    
    console.log('R&D data initialized successfully');
  } catch (error) {
    console.error('Error initializing R&D data:', error);
    throw error;
  }
}

// Set up real-time listeners for R&D data
export function setupRDDataListeners(
  onCategoriesUpdate: (categories: RDCategory[]) => void,
  onProductsUpdate: (products: RDProduct[]) => void
): () => void {
  // Listen for categories changes
  const categoriesUnsubscribe = onSnapshot(
    query(collection(db, COLLECTIONS.RD_CATEGORIES), orderBy('name')),
    snapshot => {
      const categories: RDCategory[] = [];
      snapshot.forEach(doc => {
        categories.push({
          ...doc.data(),
          id: doc.id
        } as RDCategory);
      });
      onCategoriesUpdate(categories);
    },
    error => {
      console.error('Error in categories listener:', error);
    }
  );
  
  // Listen for products changes
  const productsUnsubscribe = onSnapshot(
    query(collection(db, COLLECTIONS.RD_PRODUCTS), orderBy('name')),
    snapshot => {
      const products: RDProduct[] = [];
      snapshot.forEach(doc => {
        products.push({
          ...doc.data(),
          id: doc.id
        } as RDProduct);
      });
      onProductsUpdate(products);
    },
    error => {
      console.error('Error in products listener:', error);
    }
  );
  
  // Return a function to unsubscribe from both listeners
  return () => {
    categoriesUnsubscribe();
    productsUnsubscribe();
  };
}