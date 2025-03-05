import { useState, useCallback, useEffect, useRef } from 'react';
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
import { db, auth, createLogEntry, COLLECTIONS, initRecaptcha } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  UserCredential,
  PhoneAuthProvider,
  multiFactor,
  getMultiFactorResolver,
  PhoneMultiFactorGenerator,
  MultiFactorResolver
} from 'firebase/auth';
import type { User } from '../types/types';

const AUTH_TIMEOUT = 30000; // 30 second timeout for auth operations

export function useAuth() {
  const [authState, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
    mfaResolver?: MultiFactorResolver;
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

  // Refs for cleanup
  const timeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const login = useCallback(async (email: string, password: string) => {
    cleanup(); // Clear any existing timeouts
    
    // Create new abort controller and timeout
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Login timed out. Please try again.'));
        }, AUTH_TIMEOUT);
      });

      // Initialize reCAPTCHA
      await initRecaptcha();

      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Race between auth operation and timeout
      const result = await Promise.race([
        (async () => {
          // Special handling for admin user
          if (email === 'admin@cokelateh.com') {
            let userCredential: UserCredential;
            
            try {
              userCredential = await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
              if (err.code === 'auth/user-not-found') {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
              } else {
                throw err;
              }
            }

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
            
            await createLogEntry({
              userId: user.id,
              username: user.email,
              action: 'User Login',
              category: 'auth'
            });

            return { requiresMFA: false };
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

            // Check if MFA is required
            const mfaUser = multiFactor(userCredential.user);
            const requiresMFA = mfaUser.enrolledFactors.length === 0;

            if (!requiresMFA) {
              setAuthState({ user, isAuthenticated: true });
              localStorage.setItem('auth', JSON.stringify({ user, isAuthenticated: true }));

              await createLogEntry({
                userId: user.id,
                username: user.email,
                action: 'User Login',
                category: 'auth'
              });
            }

            return { requiresMFA };

          } catch (err: any) {
            if (err.code === 'auth/multi-factor-auth-required') {
              const resolver = getMultiFactorResolver(auth, err);
              setAuthState(prev => ({ ...prev, mfaResolver: resolver }));
              
              const phoneInfoOptions = {
                multiFactorHint: resolver.hints[0],
                session: resolver.session
              };
              const phoneAuthProvider = new PhoneAuthProvider(auth);
              const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier);
              
              localStorage.setItem('mfaVerificationId', verificationId);
              
              throw new Error('MFA required');
            }
            throw err;
          }
        })(),
        timeoutPromise
      ]);

      return result;

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message === 'Login timed out. Please try again.') {
        throw new Error('Login timed out. Please check your connection and try again.');
      }
      
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      
      throw error instanceof Error ? error : new Error('An error occurred during login. Please try again.');
    } finally {
      cleanup();
    }
  }, [cleanup]);

  const completeMFASetup = useCallback(async (verificationCode: string) => {
    try {
      const verificationId = localStorage.getItem('mfaVerificationId');
      if (!verificationId) {
        throw new Error('Verification session expired');
      }

      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
      
      // Complete MFA enrollment
      const user = auth.currentUser;
      if (!user) throw new Error('No user found');
      
      const mfa = multiFactor(user);
      await mfa.enroll(multiFactorAssertion, 'Phone Number');

      // Clear MFA data
      localStorage.removeItem('mfaVerificationId');
      setAuthState(prev => ({ ...prev, mfaResolver: undefined }));

      return true;
    } catch (error) {
      console.error('MFA setup error:', error);
      throw error;
    }
  }, []);

  const verifyMFACode = useCallback(async (verificationCode: string) => {
    try {
      const verificationId = localStorage.getItem('mfaVerificationId');
      if (!verificationId || !authState.mfaResolver) {
        throw new Error('Verification session expired');
      }

      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
      
      // Complete MFA verification
      await authState.mfaResolver.resolveSignIn(multiFactorAssertion);

      // Clear MFA data
      localStorage.removeItem('mfaVerificationId');
      setAuthState(prev => ({ ...prev, mfaResolver: undefined }));

      return true;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  }, [authState.mfaResolver]);

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

  return {
    ...authState,
    login,
    logout,
    hasPermission,
    completeMFASetup,
    verifyMFACode
  };
}