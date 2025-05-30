import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  query, 
  where,
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, COLLECTIONS, createLogEntry } from '../lib/firebase';
import { useAuth } from './useAuth';
import type { ApprovalForm } from '../types/types';
import { RDProduct } from '../types/rd-types';

export function useApprovalForms() {
  const [approvalForms, setApprovalForms] = useState<ApprovalForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Load approval forms
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadApprovalForms = async () => {
      try {
        setLoading(true);
        setError(null);

        const q = query(
          collection(db, COLLECTIONS.APPROVAL_FORMS),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const forms: ApprovalForm[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            productId: data.productId,
            productName: data.productName,
            createdBy: data.createdBy,
            creatorEmail: data.creatorEmail,
            formData: data.formData,
            menuSections: data.menuSections || [],
            createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
            status: data.status,
            testResults: data.testResults || [],
            hasRecipe: data.hasRecipe,
            approverNotes: data.approverNotes,
            approvedBy: data.approvedBy,
            approvedAt: data.approvedAt?.toDate?.().toISOString(),
            yield: data.yield,
            yieldUnit: data.yieldUnit,
            imageUrls: data.imageUrls || []
          } as ApprovalForm;
        });

        setApprovalForms(forms);
      } catch (err) {
        console.error('Error loading approval forms:', err);
        setError('Failed to load approval forms');
      } finally {
        setLoading(false);
      }
    };

    loadApprovalForms();
  }, [isAuthenticated]);

  // Create a new approval form
  const addApprovalForm = useCallback(async (
    rdProduct: RDProduct, 
    formData: Record<string, any>
  ) => {
    try {
      if (!user) throw new Error('You must be logged in to create an approval form');
      
      const approvalFormData = {
        productId: rdProduct.id,
        productName: rdProduct.name,
        createdBy: user.id,
        creatorEmail: user.email,
        formData,
        menuSections: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending',
        testResults: rdProduct.testResults || [],
        hasRecipe: !!rdProduct.recipeIngredients?.length || false,
        approverNotes: '',
        imageUrls: rdProduct.imageUrls || [],
        yield: rdProduct.minOrder || 1,
        yieldUnit: rdProduct.unit || 'pcs'
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.APPROVAL_FORMS), approvalFormData);
      
      // Create log entry
      await createLogEntry({
        userId: user.id,
        username: user.email,
        action: 'Created Approval Form',
        category: 'feature',
        details: `Created approval form for ${rdProduct.name}`
      });
      
      const newForm: ApprovalForm = {
        id: docRef.id,
        ...approvalFormData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any; // The "as any" is just to handle the serverTimestamp conversion
      
      setApprovalForms(prev => [newForm, ...prev]);
      
      return docRef.id;
    } catch (err) {
      console.error('Error adding approval form:', err);
      throw err;
    }
  }, [user]);
  
  // Get approval form by product ID
  const getApprovalFormByProductId = useCallback(async (productId: string): Promise<ApprovalForm | null> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.APPROVAL_FORMS),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        productId: data.productId,
        productName: data.productName,
        createdBy: data.createdBy,
        creatorEmail: data.creatorEmail,
        formData: data.formData,
        menuSections: data.menuSections || [],
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        status: data.status,
        testResults: data.testResults || [],
        hasRecipe: data.hasRecipe,
        approverNotes: data.approverNotes,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt?.toDate?.().toISOString(),
        yield: data.yield,
        yieldUnit: data.yieldUnit,
        imageUrls: data.imageUrls || []
      } as ApprovalForm;
    } catch (err) {
      console.error('Error getting approval form by product ID:', err);
      throw err;
    }
  }, []);

  // Update an approval form
  const updateApprovalForm = useCallback(async (
    id: string,
    data: Partial<ApprovalForm>
  ) => {
    try {
      if (!user) throw new Error('You must be logged in to update an approval form');
      
      const formRef = doc(db, COLLECTIONS.APPROVAL_FORMS, id);
      
      // Remove fields that shouldn't be directly updated
      const { id: _, createdAt, updatedAt, ...updateData } = data;
      
      await updateDoc(formRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      // Create log entry
      await createLogEntry({
        userId: user.id,
        username: user.email,
        action: 'Updated Approval Form',
        category: 'feature',
        details: `Updated approval form ${id}`
      });
      
      setApprovalForms(prev => prev.map(form => 
        form.id === id ? { 
          ...form, 
          ...data,
          updatedAt: new Date().toISOString() 
        } : form
      ));
    } catch (err) {
      console.error('Error updating approval form:', err);
      throw err;
    }
  }, [user]);

  // Delete an approval form
  const deleteApprovalForm = useCallback(async (id: string) => {
    try {
      if (!user) throw new Error('You must be logged in to delete an approval form');
      
      await deleteDoc(doc(db, COLLECTIONS.APPROVAL_FORMS, id));
      
      // Create log entry
      await createLogEntry({
        userId: user.id,
        username: user.email,
        action: 'Deleted Approval Form',
        category: 'feature',
        details: `Deleted approval form ${id}`
      });
      
      setApprovalForms(prev => prev.filter(form => form.id !== id));
    } catch (err) {
      console.error('Error deleting approval form:', err);
      throw err;
    }
  }, [user]);

  // Approve or reject an approval form
  const updateApprovalStatus = useCallback(async (
    id: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    try {
      if (!user) throw new Error('You must be logged in to update an approval form');
      
      const formRef = doc(db, COLLECTIONS.APPROVAL_FORMS, id);
      
      await updateDoc(formRef, {
        status,
        approverNotes: notes || '',
        approvedBy: user.email,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Create log entry
      await createLogEntry({
        userId: user.id,
        username: user.email,
        action: `${status === 'approved' ? 'Approved' : 'Rejected'} Approval Form`,
        category: 'feature',
        details: `${status === 'approved' ? 'Approved' : 'Rejected'} approval form ${id}`
      });
      
      setApprovalForms(prev => prev.map(form => 
        form.id === id ? { 
          ...form, 
          status,
          approverNotes: notes || '',
          approvedBy: user.email,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } : form
      ));
    } catch (err) {
      console.error('Error updating approval status:', err);
      throw err;
    }
  }, [user]);

  return {
    approvalForms,
    loading,
    error,
    addApprovalForm,
    getApprovalFormByProductId,
    updateApprovalForm,
    deleteApprovalForm,
    updateApprovalStatus
  };
}