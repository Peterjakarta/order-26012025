import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, createLogEntry, COLLECTIONS } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import type { User } from '../types/types';

export function useAuth() {
  const [authState, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
  }>(() => {
    // Check for stored auth on init
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { user: null, isAuthenticated: false };
      }
    }
    return { user: null, isAuthenticated: false };
  });

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Special handling for admin user
      if (email === 'admin@cokelateh.com') {
        let userCredential: UserCredential;
        
        try {
          // Try to sign in first
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
          // If admin doesn't exist, create it
          if (err.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } else {
            throw err;
          }
        }

        // Get or create admin document
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid));
        
        if (!userDoc.exists()) {
          await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
            email,
            role: 'admin',
            permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders'],
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }

        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: 'admin',
          permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders']
        };

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));
        
        // Create login log entry
        await createLogEntry({
          userId: user.id,
          username: user.email,
          action: 'User Login',
          category: 'auth'
        });

        return true;
      }

      // Regular user login
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid));

        if (!userDoc.exists()) {
          throw new Error('User account not found. Please contact an administrator.');
        }

        const userData = userDoc.data();
        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: userData.role,
          permissions: userData.permissions
        };

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));

        // Create login log entry
        await createLogEntry({
          userId: user.id,
          username: user.email,
          action: 'User Login',
          category: 'auth'
        });

        return true;
      } catch (err) {
        if (err.code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password. Please try again.');
        } else if (err.code === 'auth/user-not-found') {
          throw new Error('No account found with this email.');
        } else if (err.code === 'auth/wrong-password') {
          throw new Error('Incorrect password.');
        } else if (err.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later.');
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error instanceof Error ? error : new Error('An error occurred during login. Please try again.');
    }
  }, []);

  const logout = useCallback(() => {
    // Create logout log entry if user exists
    if (authState.user) {
      createLogEntry({
        userId: authState.user.id,
        username: authState.user.email,
        action: 'User Logout',
        category: 'auth'
      });
    }

    setAuthState({
      user: null,
      isAuthenticated: false
    });
    localStorage.removeItem('auth');
    window.location.href = '/login';
  }, [authState.user]);

  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions.includes(permission) || false;
  }, [authState.user]);

  const getUsers = useCallback(async () => {
    try {
      // Check if user has permission to manage users
      if (!authState.user?.permissions.includes('manage_users')) {
        console.error('User does not have permission to manage users');
        return [];
      }

      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, orderBy('email'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        email: doc.data().email,
        role: doc.data().role,
        permissions: doc.data().permissions
      }));
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.error('Permission denied: User does not have access to manage users');
      } else {
        console.error('Error getting users:', error);
      }
      return [];
    }
  }, [authState.user?.permissions]);

  const addUser = useCallback(async (
    email: string,
    password: string,
    role: 'admin' | 'staff',
    permissions: string[]
  ) => {
    try {
      // Validate email and password
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Add user to Firestore
      await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
        email,
        role,
        permissions,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create log entry
      await createLogEntry({
        userId: userCredential.user.uid,
        username: email,
        action: 'User Created',
        category: 'auth'
      });

      return true;
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (
    email: string,
    data: {
      role: 'admin' | 'staff';
      permissions: string[];
    }
  ) => {
    try {
      // Find user by email
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('User not found');
      }

      const userDoc = snapshot.docs[0];

      // Update user in Firestore
      await updateDoc(userDoc.ref, {
        role: data.role,
        permissions: data.permissions,
        updated_at: serverTimestamp()
      });

      // Update auth state if this is the current user
      if (authState.user?.email === email) {
        setAuthState(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            role: data.role,
            permissions: data.permissions
          }
        }));
      }

      return true;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }, [authState.user]);

  const removeUser = useCallback(async (email: string) => {
    try {
      // Find user by email
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('User not found');
      }

      const userDoc = snapshot.docs[0];

      // Delete from Firestore
      await deleteDoc(userDoc.ref);

      return true;
    } catch (error) {
      console.error('Remove user error:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    hasPermission,
    addUser,
    updateUser,
    removeUser,
    getUsers
  };
}