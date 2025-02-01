import { initializeApp } from 'firebase/app';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  addDoc,
  getFirestore,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore
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

// Initialize Firestore with memory-only cache to avoid persistence issues
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  experimentalForceLongPolling: true // Use long polling for more stable connection
});

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