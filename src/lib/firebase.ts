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
  console.warn('The application will continue with limited functionality.');
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

// Default Firebase config if environment variables are missing
const defaultConfig = {
  apiKey: "AIzaSyBR8Wzs6GQkRFZcGLEP-5kAQHyFsLOu7tk", // Demo project API key
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:a1b2c3d4e5f6a1b2c3d4e5"
};

// Get Firebase config from environment variables, fallback to default if needed
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  // Explicitly set Node.js runtime version
  functions: {
    runtime: 'nodejs18'
  }
};

console.log('Firebase configuration:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? "***** (masked for security)" : "undefined"
});

// Initialize Firebase with Node.js 18 runtime
let app;

try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  console.warn('The application will continue with limited functionality.');
}

// Initialize Firestore with default settings
let db;

try {
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  console.warn('The application will continue without database functionality.');
}

// Initialize Auth
let auth;

try {
  auth = getAuth(app);
  console.log('Firebase Auth initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Auth:', error);
  console.warn('The application will continue without authentication functionality.');
}

// Initialize persistence with improved error handling
const initializePersistence = async () => {
  if (!db) {
    console.warn('Cannot enable persistence: Firestore not initialized');
    return;
  }

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
  
  if (!db) {
    return;
  }
  
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
    if (!db || !isOnline) {
      console.warn('Skipping log entry creation - offline mode or Firestore unavailable');
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
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  return writeBatch(db);
}

export async function commitBatchIfNeeded(batch: any, operationCount: number, limit: number = 500) {
  if (operationCount >= limit) {
    await batch.commit();
    return { batch: getBatch(), operationCount: 0 };
  }
  return { batch, operationCount };
}

// Initialize persistence only if Firestore is available
if (db) {
  initializePersistence().catch(console.error);
}

export { db, auth };