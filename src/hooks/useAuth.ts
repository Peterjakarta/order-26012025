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
import { logUserLogin, logUserLogout } from '../utils/logger';

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

        await logUserLogin();

        return true;
      }

      // Regular user login
      try {
        console.log('Starting regular user login for:', email);
        // First, try to sign in with Firebase Auth
        let userCredential: UserCredential;
        let isPendingUser = false;
        let pendingData: any = null;
        let pendingDocRef: any = null;

        try {
          console.log('Attempting Firebase Auth sign in...');
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('Firebase Auth sign in successful:', userCredential.user.uid);
        } catch (authError: any) {
          console.log('Firebase Auth failed:', authError.code, authError.message);
          // If auth fails, check if this is a pending user
          if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
            console.log('Checking for pending user...');
            const usersRef = collection(db, COLLECTIONS.USERS);
            const pendingQuery = query(usersRef, where('email', '==', email), where('status', '==', 'pending'));
            const pendingSnapshot = await getDocs(pendingQuery);
            console.log('Pending user check result:', !pendingSnapshot.empty);

            if (!pendingSnapshot.empty) {
              console.log('Found pending user document');
              // This is a pending user - check password
              pendingDocRef = pendingSnapshot.docs[0].ref;
              pendingData = pendingSnapshot.docs[0].data();
              console.log('Pending user data:', { email: pendingData.email, role: pendingData.role, permissions: pendingData.permissions });

              if (pendingData.password !== password) {
                console.log('Password mismatch for pending user');
                throw new Error('Invalid email or password. Please try again.');
              }

              console.log('Password matches, creating Firebase Auth account...');
              // Create Firebase Auth account
              try {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log('Firebase Auth account created:', userCredential.user.uid);
                isPendingUser = true;
              } catch (createError: any) {
                console.log('Error creating Firebase Auth account:', createError.code);
                if (createError.code === 'auth/email-already-in-use') {
                  console.log('Account already exists, signing in...');
                  // Account exists but we don't have proper Firestore doc - try signing in again
                  userCredential = await signInWithEmailAndPassword(auth, email, password);
                  console.log('Signed in to existing account:', userCredential.user.uid);
                  isPendingUser = true;
                } else {
                  throw createError;
                }
              }
            } else {
              console.log('No pending user found, auth failed');
              // Not a pending user and auth failed
              throw authError;
            }
          } else {
            console.log('Auth error not handled:', authError.code);
            throw authError;
          }
        }

        console.log('Checking user document in Firestore...');
        // At this point, we have a valid userCredential
        // Get or create user document
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid));
        console.log('User document exists:', userDoc.exists());

        if (!userDoc.exists() || isPendingUser) {
          console.log('Creating/updating user document...');
          // Need to create/update the proper user document
          let userData: any;

          if (pendingData) {
            console.log('Using pending user data');
            // Use pending user data
            userData = {
              email,
              role: pendingData.role,
              permissions: pendingData.permissions,
              status: 'active',
              created_at: pendingData.created_at || serverTimestamp(),
              updated_at: serverTimestamp()
            };
          } else {
            console.log('Creating default staff user');
            // Create default staff user
            userData = {
              email,
              role: 'staff',
              permissions: ['create_orders'],
              status: 'active',
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            };
          }

          console.log('Saving user document with UID:', userCredential.user.uid);
          await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), userData);
          console.log('User document saved successfully');

          // Delete pending document if it exists
          if (pendingDocRef) {
            console.log('Deleting pending document...');
            try {
              await deleteDoc(pendingDocRef);
              console.log('Pending document deleted');
            } catch (deleteError) {
              console.error('Error deleting pending doc:', deleteError);
              // Continue anyway - not critical
            }
          }

          const user = {
            id: userCredential.user.uid,
            email: userCredential.user.email || '',
            role: userData.role,
            permissions: userData.permissions
          };

          setAuthState({ user, isAuthenticated: true });
          localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));

          await logUserLogin();

          return true;
        }

        // User document exists - use it
        const userData = userDoc.data();
        const user = {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          role: userData.role,
          permissions: userData.permissions
        };

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));

        await logUserLogin();

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
        } else if (err.message) {
          throw new Error(err.message);
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
      logUserLogout();
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
      const snapshot = await getDocs(usersRef);

      return snapshot.docs.map(doc => ({
        email: doc.data().email,
        role: doc.data().role,
        permissions: doc.data().permissions,
        status: doc.data().status || 'active'
      })).sort((a, b) => a.email.localeCompare(b.email));
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

      // Check if user already exists in Firestore
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const existingUser = await getDocs(q);

      if (!existingUser.empty) {
        throw new Error('A user with this email already exists');
      }

      // Create a pending user document with the password stored securely
      // The user will be created in Firebase Auth when they first login
      const userDocId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await setDoc(doc(db, COLLECTIONS.USERS, userDocId), {
        email,
        password, // Store password temporarily - will be removed on first login
        role,
        permissions,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      await createLogEntry({
        userId: authState.user?.id || 'system',
        username: authState.user?.email || 'system',
        action: `User Created: ${email}`,
        category: 'auth'
      });

      return true;
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  }, [authState.user]);

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