import { useState, useCallback, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { db, auth } from '../lib/firebase';
import { 
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  updateProfile,
  updatePhoneNumber,
  signInWithEmailAndPassword
} from 'firebase/auth';
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

  const [verificationId, setVerificationId] = useState<string | null>(null);


  const login = useCallback(async (username: string, password: string, recaptchaVerifier: RecaptchaVerifier | null) => {
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

      // Check if 2FA is enabled
      if (userData.twoFactorMethod) {
        if (userData.twoFactorMethod === '2fa_sms' && userData.phoneNumber) {
          // Ensure we have a reCAPTCHA verifier
          if (!recaptchaVerifier) {
            throw new Error('reCAPTCHA not initialized');
          }

          // Send SMS verification code using Firebase Phone Auth
          const phoneProvider = new PhoneAuthProvider(auth);
          const verId = await phoneProvider.verifyPhoneNumber(userData.phoneNumber, recaptchaVerifier);
          setVerificationId(verId);
          return 'sms_verification_needed';
        } else if (userData.twoFactorMethod === '2fa_email' && userData.email) {
          try {
            // Create a temporary user session
            const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
            
            // Send email verification code
            await sendEmailVerification(userCredential.user, {
              url: window.location.origin + '/verify-email',
            });
            
            return 'email_verification_needed';
          } catch (error) {
            console.error('Error sending email verification:', error);
            throw error;
          }
        }
      }
      // Set auth state
      const user = {
        id: userDoc.id,
        username: userData.username,
        role: userData.role,
        permissions: userData.permissions,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        twoFactorMethod: userData.twoFactorMethod
      };

      setAuthState({
        user,
        isAuthenticated: true,
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

  const verifyCode = useCallback(async (code: string) => {
    try {
      if (!verificationId) {
        throw new Error('No verification ID found');
      }

      const credential = PhoneAuthProvider.credential(
        verificationId!,
        code
      );

      await auth.signInWithCredential(credential);
      
      // Clear verification ID and complete authentication
      setVerificationId(null);
      setAuthState(prev => ({ ...prev, isAuthenticated: true }));
      localStorage.setItem('auth', JSON.stringify({ user: authState.user, isAuthenticated: true }));

      return true;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  }, [verificationId]);

  const updateUserTwoFactor = useCallback(async (
    username: string,
    method: '2fa_email' | '2fa_sms' | null,
    email?: string,
    phoneNumber?: string
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
        twoFactorMethod: method,
        ...(email && { email }),
        ...(phoneNumber && { phoneNumber }),
        updated_at: serverTimestamp()
      });

      // Update auth state if this is the current user
      if (authState.user?.username === username) {
        setAuthState(prev => ({
          ...prev,
          user: {
            ...prev.user!,
            twoFactorMethod: method,
            ...(email && { email }),
            ...(phoneNumber && { phoneNumber })
          }
        }));
      }

      return true;
    } catch (error) {
      console.error('Update 2FA error:', error);
      throw error;
    }
  }, [authState.user]);
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
    getUsers,
    verifyCode,
    updateUserTwoFactor
  };
}