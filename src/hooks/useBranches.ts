import React, { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Branch } from '../types/types';
import { branches as initialBranches } from '../data/branches';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize branches in Firestore if they don't exist
  const initializeBranches = useCallback(async () => {
    try {
      console.log('Checking for existing branches...');
      const branchesRef = collection(db, 'branches');
      const q = query(branchesRef);
      const snapshot = await getDocs(q);
      
      // Only initialize if no branches exist
      if (snapshot.empty) {
        console.log('No branches found, initializing...');
        const batch = writeBatch(db);
        
        // Add each branch from our initial data with proper IDs
        initialBranches.forEach(branch => {
          const docRef = doc(branchesRef, branch.id);
          batch.set(docRef, {
            ...branch,
            id: branch.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log('Branches successfully initialized in Firestore');
      } else {
        console.log(`Found ${snapshot.size} existing branches`);
        
        // Check if we need to add any new branches
        const existingBranches = new Set(snapshot.docs.map(doc => doc.id));
        const missingBranches = initialBranches.filter(branch => !existingBranches.has(branch.id));
        
        if (missingBranches.length > 0) {
          console.log(`Adding ${missingBranches.length} new branches...`);
          const batch = writeBatch(db);
          
          missingBranches.forEach(branch => {
            const docRef = doc(branchesRef, branch.id);
            batch.set(docRef, {
              ...branch,
              id: branch.id,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          });
          
          await batch.commit();
          console.log('New branches added successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing branches:', error);
      setError('Failed to initialize branches');
    }
  }, []);

  // Subscribe to branches from Firebase
  const { useEffect } = React;
  useEffect(() => {
    // Initialize branches when component mounts
    initializeBranches();
    
    const q = query(collection(db, COLLECTIONS.BRANCHES), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const branchesData: Branch[] = [];
        snapshot.forEach((doc) => {
          branchesData.push({ id: doc.id, ...doc.data() } as Branch);
        });
        setBranches(branchesData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching branches:', err);
        setError('Failed to load branches');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [initializeBranches]);

  const addBranch = useCallback(async (data: Omit<Branch, 'id'>) => {
    try {
      // Generate a sanitized ID from the branch name
      const id = data.name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Add branch with custom ID
      await setDoc(doc(db, COLLECTIONS.BRANCHES, id), {
        id,
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding branch:', error);
      throw error;
    }
  }, []);

  const updateBranch = useCallback(async (id: string, data: Omit<Branch, 'id'>) => {
    try {
      const branchRef = doc(db, COLLECTIONS.BRANCHES, id);
      await updateDoc(branchRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating branch:', error);
      throw error;
    }
  }, []);

  const deleteBranch = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BRANCHES, id));
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }, []);

  return {
    branches,
    loading,
    error,
    addBranch,
    updateBranch,
    deleteBranch
  };
}