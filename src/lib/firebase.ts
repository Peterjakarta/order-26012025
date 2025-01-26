import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import bcrypt from 'bcryptjs';

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

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Collection names
export const COLLECTIONS = {
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'orderItems',
  BRANCHES: 'branches',
  INGREDIENTS: 'ingredients',
  RECIPES: 'recipes',
  USERS: 'users'
} as const;

// Create default admin user if it doesn't exist
async function createDefaultAdmin() {
  try {
    // Check if admin user exists in Firestore
    const usersRef = collection(db, COLLECTIONS.USERS);
    const adminDoc = await getDoc(doc(usersRef, 'admin'));
    
    if (!adminDoc.exists()) {
      // Hash password for Firestore
      const hashedPassword = await bcrypt.hash('stafcokelateh', 10);

      // Create admin user in Firestore
      await setDoc(doc(usersRef, 'admin'), {
        username: 'admin',
        password_hash: hashedPassword,
        role: 'admin',
        permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders'],
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, offline persistence disabled');
    } else if (err.code === 'unimplemented') {
      console.warn('Current browser doesn\'t support offline persistence');
    }
  });

// Create default admin user
createDefaultAdmin();

export { db, auth };