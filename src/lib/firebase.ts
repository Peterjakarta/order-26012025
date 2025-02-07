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
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import type { LogEntry } from '../types/types';

// Network status management
let isOnline = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

// Network status management functions
export function getNetworkStatus() {
  return isOnline;
}

// Reconnection handler
async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('Max reconnection attempts reached');
    return;
  }

  try {
    await enableNetwork(db);
    isOnline = true;
    reconnectAttempts = 0;
    console.log('Successfully reconnected to Firestore');
    window.dispatchEvent(new Event('firestore-reconnected'));
  } catch (err) {
    reconnectAttempts++;
    console.warn(`Reconnection attempt ${reconnectAttempts} failed, retrying in ${RECONNECT_DELAY}ms`);
    setTimeout(attemptReconnect, RECONNECT_DELAY);
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyAFc0V_u1m2AbrW7tkR525Wj-tUwlUEOBw",
  authDomain: "cokelateh-a7b9d.firebaseapp.com", 
  projectId: "cokelateh-a7b9d",
  storageBucket: "cokelateh-a7b9d.firebasestorage.app",
  messagingSenderId: "873783861603",
  appId: "1:873783861603:web:c13e7b7b63adb19c90f356"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings
const firestoreSettings = {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
};

const db = initializeFirestore(app, firestoreSettings);

// Initialize Auth
const auth = getAuth(app);

// Initialize persistence
const initializePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('Persistence enabled successfully');
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs detected - persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence not supported in this browser');
    } else {
      console.error('Error enabling persistence:', err);
    }
  }
};

window.addEventListener('online', () => {
  console.log('Reconnecting to Firestore...');
  isOnline = true;
  reconnectAttempts = 0;
  attemptReconnect();
});

window.addEventListener('offline', () => {
  console.log('Disconnecting from Firestore due to offline...');
  isOnline = false;
  disableNetwork(db).catch(console.error);
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
  STOCK_CATEGORIES: 'stock_categories',
  STOCK_CATEGORY_ITEMS: 'stock_category_items',
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

// Initialize persistence
initializePersistence();

export { db, auth };