import React, { useState, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Branch } from '../types/types';

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to branches from Firebase
  const { useEffect } = React;
  useEffect(() => {
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
  }, []);

  const addBranch = useCallback(async (data: Omit<Branch, 'id'>) => {
    try {
      await addDoc(collection(db, COLLECTIONS.BRANCHES), {
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