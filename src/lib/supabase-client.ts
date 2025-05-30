import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

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
    const { data: buckets } = await supabase.storage.listBuckets();
    
    const bucketExists = buckets?.some(bucket => bucket.name === DOCUMENTS_BUCKET);
    
    if (!bucketExists) {
      // Create the bucket
      const { error } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      });
      
      if (error) {
        console.error('Error creating storage bucket:', error);
        throw error;
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
  category_id: string;
  tags?: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Function to fetch document categories
export const getDocumentCategories = async (): Promise<DocumentCategory[]> => {
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
  const userId = await getCurrentUserId();
  
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
  title: string,
  categoryId: string,
  description?: string,
  tags?: string[]
): Promise<DocumentMetadata> => {
  try {
    const userId = await getCurrentUserId();
    
    // 1. Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file);
      
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }
    
    // 2. Determine file type
    let fileType = 'other';
    if (file.type === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'text/csv'
    ) {
      fileType = 'excel';
    }
    
    // 3. Insert document metadata into database
    const { data, error } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        file_name: file.name,
        file_type: fileType,
        file_path: filePath,
        file_size: file.size,
        category_id: categoryId,
        tags,
        created_by: userId
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating document metadata:', error);
      
      // Attempt to clean up the uploaded file
      await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([filePath]);
        
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in uploadDocument:', error);
    throw error;
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
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry
    
  if (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
  
  return data.signedUrl;
};