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
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  UserCredential, 
  onAuthStateChanged 
} from 'firebase/auth';
import type { User } from '../types/types';

export function useAuth() {
  const [authState, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
  }>(() => {
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

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user document from Firestore
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: userData.role,
              permissions: userData.permissions
            };
            
            setAuthState({ user, isAuthenticated: true });
            localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));
          } else {
            // If no user document, check if it's the admin
            if (firebaseUser.email === 'admin@cokelateh.com') {
              const user = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'admin',
                permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders']
              };
              
              setAuthState({ user, isAuthenticated: true });
              localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));
            } else {
              // Create default user document for staff
              await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
                email: firebaseUser.email,
                role: 'staff',
                permissions: ['create_orders'],
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
              });
              
              const user = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                role: 'staff',
                permissions: ['create_orders']
              };
              
              setAuthState({ user, isAuthenticated: true });
              localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthState({ user: null, isAuthenticated: false });
          localStorage.removeItem('auth');
        }
      } else {
        // User is signed out
        setAuthState({ user: null, isAuthenticated: false });
        localStorage.removeItem('auth');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Special handling for admin user
      if (email === 'admin@cokelateh.com') {
        let userCredential: UserCredential;
        
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Create admin document
            await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
              email,
              role: 'admin',
              permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders'],
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            });
          } else {
            throw err;
          }
        }

        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: 'admin',
          permissions: ['manage_users', 'manage_orders', 'manage_products', 'create_orders']
        };

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));
        
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
        
        // Get user document
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid));
        
        // If user document doesn't exist, create it with default staff permissions
        if (!userDoc.exists()) {
          await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
            email,
            role: 'staff',
            permissions: ['create_orders'],
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }

        const userData = userDoc.exists() ? userDoc.data() : { role: 'staff', permissions: ['create_orders'] };
        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: userData.role,
          permissions: userData.permissions
        };

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));

        await createLogEntry({
          userId: user.id,
          username: user.email,
          action: 'User Login',
          category: 'auth'
        });

        return true;
      } catch (err: any) {
        if (err.code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password. Please try again.');
        } else if (err.code === 'auth/user-not-found') {
          throw new Error('No account found with this email.');
        } else if (err.code === 'auth/wrong-password') {
          throw new Error('Incorrect password.');
        } else if (err.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later.');
        }
        throw err;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error instanceof Error ? error : new Error('An error occurred during login. Please try again.');
    }
  }, []);

  const logout = useCallback(() => {
    if (authState.user) {
      createLogEntry({
        userId: authState.user.id,
        username: authState.user.email,
        action: 'User Logout',
        category: 'auth'
      });
    }

    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem('auth');
    window.location.href = '/login';
  }, [authState.user]);

  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions.includes(permission) || false;
  }, [authState.user]);

  const getUsers = useCallback(async () => {
    try {
      if (!hasPermission('manage_users')) {
        throw new Error('You do not have permission to manage users');
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
      console.error('Error getting users:', error);
      throw error;
    }
  }, [hasPermission]);

  const addUser = useCallback(async (
    email: string,
    password: string,
    role: 'admin' | 'staff',
    permissions: string[]
  ) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
        email,
        role,
        permissions,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

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
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('User not found');
      }

      const userDoc = snapshot.docs[0];

      await updateDoc(userDoc.ref, {
        role: data.role,
        permissions: data.permissions,
        updated_at: serverTimestamp()
      });

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
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('User not found');
      }

      const userDoc = snapshot.docs[0];
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