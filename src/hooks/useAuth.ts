import { useState, useCallback, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { db } from '../lib/firebase';
import { 
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import type { User } from '../types/types';

const COLLECTIONS = {
  USERS: 'users'
};

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

  const login = useCallback(async (username: string, password: string) => {
    try {
      // Get user from Firestore by username
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return false;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Verify password
      const isValid = await bcrypt.compare(password, userData.password_hash);
      if (!isValid) {
        return false;
      }

      // Set auth state
      const user = {
        id: userDoc.id,
        username: userData.username,
        role: userData.role,
        permissions: userData.permissions
      };

      setAuthState({
        user,
        isAuthenticated: true
      });

      // Store auth state
      localStorage.setItem('auth', JSON.stringify({
        user,
        isAuthenticated: true
      }));

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false
    });
    localStorage.removeItem('auth');
    window.location.href = '/login';
  }, []);

  const addUser = useCallback(async (
    username: string,
    password: string,
    role: 'admin' | 'staff',
    permissions: string[]
  ) => {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Add user to Firestore
      const usersRef = collection(db, COLLECTIONS.USERS);
      await setDoc(doc(usersRef), {
        username,
        password_hash: hashedPassword,
        role,
        permissions,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Add user error:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (
    username: string,
    data: {
      role: 'admin' | 'staff';
      permissions: string[];
    }
  ) => {
    try {
      // Find user by username
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
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
      if (authState.user?.username === username) {
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

  const removeUser = useCallback(async (username: string) => {
    try {
      // Find user by username
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
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

  const changePassword = useCallback(async (
    username: string,
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      // Find user by username
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return false;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userData.password_hash);
      if (!isValid) {
        return false;
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password in Firestore
      await updateDoc(userDoc.ref, {
        password_hash: newHash,
        updated_at: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }, []);

  const hasPermission = useCallback((permission: string) => {
    return authState.user?.permissions.includes(permission) || false;
  }, [authState.user]);

  const getUsers = useCallback(async () => {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, orderBy('username'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        username: doc.data().username,
        role: doc.data().role,
        permissions: doc.data().permissions
      }));
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }, []);

  return {
    ...authState,
    login,
    logout,
    changePassword,
    hasPermission,
    addUser,
    updateUser,
    removeUser,
    getUsers
  };
}