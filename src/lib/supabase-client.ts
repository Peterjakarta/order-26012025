import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { v4 as uuidv4 } from 'uuid';

// Make sure we have the required environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a single supabase client for the entire app
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Helper to get current user's ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// Document storage bucket name
export const DOCUMENTS_BUCKET = 'documents';

// Initialize storage bucket if it doesn't exist
export const initializeStorage = async (): Promise<void> => {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      throw error;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === DOCUMENTS_BUCKET);
    
    if (!bucketExists) {
      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
        public: false,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating storage bucket:', createError);
        throw createError;
      }
      
      console.log('Created documents storage bucket');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
    throw error;
  }
};

// Type definitions
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  description?: string | null;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  category_id: string | null;
  tags?: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
}

// Function to fetch document categories
export const getDocumentCategories = async (): Promise<DocumentCategory[]> => {
  // Check if user is authenticated
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be authenticated to view document categories. Please sign in and try again.');
  }
  
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching document categories:', error);
    throw error;
  }
  
  return data || [];
};

// Function to create a document category
export const createDocumentCategory = async (
  name: string, 
  description?: string
): Promise<DocumentCategory> => {
  // Check if user is authenticated
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be authenticated to create document categories. Please sign in and try again.');
  }
  
  const { data, error } = await supabase
    .from('document_categories')
    .insert({
      name,
      description,
      created_by: userId
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating document category:', error);
    if (error.message.includes('row-level security policy')) {
      throw new Error('Row-level security policy prevented creating a document category. Please ensure RLS policies are configured correctly for the document_categories table.');
    }
    throw error;
  }
  
  return data;
};

// Function to update a document category
export const updateDocumentCategory = async (
  id: string,
  name: string,
  description?: string
): Promise<DocumentCategory> => {
  // Check if user is authenticated
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be authenticated to update document categories. Please sign in and try again.');
  }
  
  const { data, error } = await supabase
    .from('document_categories')
    .update({
      name,
      description,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating document category:', error);
    throw error;
  }
  
  return data;
};

// Function to delete a document category
export const deleteDocumentCategory = async (id: string): Promise<void> => {
  // Check if user is authenticated
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be authenticated to delete document categories. Please sign in and try again.');
  }
  
  // First, reassign all documents in this category to the General category
  const { data: generalCategory } = await supabase
    .from('document_categories')
    .select('id')
    .eq('name', 'General')
    .single();
    
  if (generalCategory) {
    // Update documents to use the General category
    const { error: updateError } = await supabase
      .from('documents')
      .update({ category_id: generalCategory.id })
      .eq('category_id', id);
      
    if (updateError) {
      console.error('Error reassigning documents:', updateError);
      throw updateError;
    }
  }
  
  // Then delete the category
  const { error } = await supabase
    .from('document_categories')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting document category:', error);
    throw error;
  }
};

// Function to upload a document
export const uploadDocument = async (
  file: File,
  uniqueFilename: string,
  metadata: {
    title: string;
    description?: string;
    fileType: string;
    categoryId: string;
    tags?: string[];
  }
): Promise<{ data: DocumentMetadata, error: null } | { data: null, error: Error }> => {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be authenticated to upload documents. Please sign in and try again.');
    }
    
    // 1. Generate a unique file path
    const fileExt = file.name.split('.').pop() || '';
    const filePath = `${userId}/${uniqueFilename}`;
    
    // 2. Upload file to Supabase Storage
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { data: null, error: uploadError };
    }
    
    // 3. Determine file type
    let fileType = metadata.fileType || 'other';
    
    // 4. Insert document metadata into database
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: metadata.title,
        description: metadata.description,
        file_name: file.name,
        file_type: fileType,
        file_path: filePath,
        file_size: file.size,
        category_id: metadata.categoryId,
        tags: metadata.tags,
        created_by: userId,
        user_id: userId
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating document metadata:', error);
      
      // Attempt to clean up the uploaded file
      await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([filePath]);
        
      return { data: null, error: new Error(error.message) };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in uploadDocument:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error in uploadDocument') 
    };
  }
};

// Function to fetch documents with pagination
export const getDocuments = async (
  page: number = 1,
  perPage: number = 12,
  categoryId?: string,
  searchQuery?: string
): Promise<{ data: DocumentMetadata[], count: number }> => {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be authenticated to view documents. Please sign in and try again.');
    }
    
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' });
      
    // Apply category filter if provided
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }
    
    // Apply search filter if provided
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
    
    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Error in getDocuments:', error);
    throw error;
  }
};

// Function to delete a document
export const deleteDocument = async (id: string, filePath: string): Promise<void> => {
  try {
    // Check if user is authenticated
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('You must be authenticated to delete documents. Please sign in and try again.');
    }
    
    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([filePath]);
      
    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      throw storageError;
    }
    
    // Delete the metadata from the database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting document metadata:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteDocument:', error);
    throw error;
  }
};

// Function to get a download URL for a document
export const getDocumentUrl = async (filePath: string): Promise<string> => {
  // Check if user is authenticated
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('You must be authenticated to access document URLs. Please sign in and try again.');
  }
  
  // Return a sample URL for testing if the file path doesn't look like a real Supabase path
  if (!filePath.includes('/')) {
    console.log('Using mock URL for testing');
    // For PDF, return a sample PDF
    if (filePath.endsWith('.pdf')) {
      return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    }
    // For Excel, return a sample image
    if (filePath.includes('excel')) {
      return 'https://images.pexels.com/photos/6120251/pexels-photo-6120251.jpeg?auto=compress&cs=tinysrgb&w=1600';
    }
    // For other files, return a sample image
    return 'https://images.pexels.com/photos/5805086/pexels-photo-5805086.jpeg?auto=compress&cs=tinysrgb&w=1600';
  }

  try {
    // Create a signed URL that works for 1 hour
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(filePath, 60 * 60);
      
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting document URL:', error);
    throw error;
  }
};