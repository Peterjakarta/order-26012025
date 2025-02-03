import { initializeApp } from 'firebase/app';
import { 
  collection, 
  doc, 
  writeBatch,
  setDoc, 
  getDoc, 
  serverTimestamp, 
  addDoc,
  getFirestore,
  initializeFirestore,
  enableIndexedDbPersistence,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import type { LogEntry } from '../types/types';

const firebaseConfig = {
  apiKey: "AIzaSyAFc0V_u1m2AbrW7tkR525Wj-tUwlUEOBw",
  authDomain: "cokelateh-a7b9d.firebaseapp.com",
  projectId: "cokelateh-a7b9d",
  storageBucket: "cokelateh-a7b9d.appspot.com",
  messagingSenderId: "873783861603",
  appId: "1:873783861603:web:c13e7b7b63adb19c90f356"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistence
const db = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024, // Reduced to 50MB for better performance
  experimentalForceLongPolling: true, // Force long polling for more reliable connections
  ignoreUndefinedProperties: true
});

// Configure persistence settings
const PERSISTENCE_SETTINGS = {
  synchronizeTabs: true,
  experimentalTabSynchronization: true
};

// Enable offline persistence
enableIndexedDbPersistence(db, PERSISTENCE_SETTINGS).catch((err) => {
  console.error('Error enabling persistence:', err);
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Persistence unavailable - multiple tabs may be open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.warn('Persistence not supported in this browser');
  }
});

// Network status management
let isOnline = true;

// Export network status checker
export const getNetworkStatus = () => isOnline;

window.addEventListener('online', () => {
  console.log('Reconnecting to Firestore...');
  isOnline = true;
  enableNetwork(db);
});

window.addEventListener('offline', () => {
  console.log('Disconnecting from Firestore due to offline...');
  isOnline = false;
  disableNetwork(db);
});

// Batch operations helper (single implementation)
let currentBatch: ReturnType<typeof writeBatch> | null = null;
let batchOperations = 0;
const MAX_BATCH_OPERATIONS = 250; // Reduced for better reliability
const BATCH_TIMEOUT = 1000; // Reduced to 1 second
let batchTimeout: NodeJS.Timeout | null = null;

export function getBatch() {
  if (!currentBatch || batchOperations >= MAX_BATCH_OPERATIONS) {
    if (currentBatch) {
      // Commit existing batch before creating new one
      const existingBatch = currentBatch;
      currentBatch = null;
      existingBatch.commit().catch(console.error);
    }
    currentBatch = writeBatch(db);
    batchOperations = 0;
    
    // Set timeout to auto-commit if no new operations
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    batchTimeout = setTimeout(() => {
      commitBatchIfNeeded().catch(console.error);
    }, BATCH_TIMEOUT);
  }
  batchOperations++;
  return currentBatch;
}

export async function commitBatchIfNeeded() {
  if (currentBatch && batchOperations > 0) {
    const batch = currentBatch;
    currentBatch = null;
    batchOperations = 0;
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
    await batch.commit();
  }
}
// Initialize Auth
const auth = getAuth(app);

// Define collection names
export const COLLECTIONS = {
  USERS: 'users',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'orderItems',
  BRANCHES: 'branches',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  STOCK: 'stock',
  STOCK_HISTORY: 'stock_history',
  LOGS: 'logs'
};

// Helper function to create log entries
export async function createLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  try {
    if (!isOnline) {
      console.warn('Skipping log entry creation - offline mode');
      return;
    }

    const logsRef = collection(db, COLLECTIONS.LOGS);
    await addDoc(logsRef, {
      ...entry,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating log entry:', error);
  }
}

// Create default admin user if it doesn't exist
async function createDefaultAdmin() {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const adminDocRef = doc(usersRef, 'admin');
    const adminDoc = await getDoc(adminDocRef);

    if (!adminDoc.exists()) {
      const hashedPassword = await bcrypt.hash('stafcokelateh', 10);
      await setDoc(adminDocRef, {
        username: 'admin',
        password_hash: hashedPassword,
        role: 'admin',
        permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders'],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      console.log('Default admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Create default admin user
createDefaultAdmin();

export { db, auth };