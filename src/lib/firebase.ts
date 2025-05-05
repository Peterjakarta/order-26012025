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
  enableIndexedDbPersistence,
  disableNetwork,
  enableNetwork,
  setLogLevel
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import type { LogEntry } from '../types/types';

// Enable more detailed logging in development
if (import.meta.env.DEV) {
  setLogLevel('debug');
}

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Network status management
let isOnline = navigator.onLine;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000; // 3 seconds
const RECONNECT_BACKOFF_FACTOR = 1.5; // Exponential backoff

// Network status management functions
export function getNetworkStatus() {
  return isOnline;
}

// Notify UI of connection status changes
function dispatchConnectionEvent(status: 'connected' | 'disconnected' | 'reconnecting') {
  window.dispatchEvent(new CustomEvent('firebase-connection', { 
    detail: { status } 
  }));
}

// Reconnection handler with improved error handling
async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('Max reconnection attempts reached');
    dispatchConnectionEvent('disconnected');
    return;
  }

  try {
    console.log(`Attempting to reconnect (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
    await enableNetwork(db);
    isOnline = true;
    dispatchConnectionEvent('connected');
    reconnectAttempts = 0;
    console.log('Successfully reconnected to Firestore');
    window.dispatchEvent(new Event('firestore-reconnected'));
  } catch (err) {
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(RECONNECT_BACKOFF_FACTOR, reconnectAttempts - 1);
    console.warn(`Reconnection attempt ${reconnectAttempts} failed, retrying in ${delay}ms`, err);
    dispatchConnectionEvent('reconnecting');
    setTimeout(attemptReconnect, delay);
  }
}

// Get Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Explicitly set Node.js runtime version
  functions: {
    runtime: 'nodejs18'
  }
};

// Initialize Firebase with Node.js 18 runtime
const app = initializeApp(firebaseConfig);

// Initialize Firestore with default settings
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Initialize persistence with improved error handling
const initializePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('Persistence enabled successfully');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs detected - persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence not supported in this browser');
    } else {
      console.error('Error enabling persistence:', err.message);
      console.debug('Persistence error details:', {
        code: err.code,
        name: err.name,
        stack: err.stack
      });
    }
  }
};

// Improved online/offline handlers
window.addEventListener('online', () => {
  console.log('Browser reports online status');
  if (!isOnline) {
    console.log('Reconnecting to Firestore...');
    isOnline = true;
    dispatchConnectionEvent('reconnecting');
    reconnectAttempts = 0;
    attemptReconnect();
  }
});

window.addEventListener('offline', async () => {
  console.log('Browser reports offline status');
  isOnline = false;
  dispatchConnectionEvent('disconnected');
  try {
    console.log('Disabling Firestore network connection...');
    await disableNetwork(db);
    console.log('Network disabled successfully');
  } catch (err) {
    console.error('Error disabling network:', err);
  }
});

// Collection names
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
  LOGS: 'logs',
  // Add RD collections
  RD_CATEGORIES: 'rd_categories',
  RD_PRODUCTS: 'rd_products'
} as const;

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

// Helper functions for batch operations
export function getBatch() {
  return writeBatch(db);
}

export async function commitBatchIfNeeded(batch: any, operationCount: number, limit: number = 500) {
  if (operationCount >= limit) {
    await batch.commit();
    return { batch: getBatch(), operationCount: 0 };
  }
  return { batch, operationCount };
}

// Initialize persistence and export
initializePersistence().catch(console.error);

export { db, auth };