// File: pages/api/upload-document.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient({ req, res });
    
    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = session.user.id;
    
    // Get form data from request
    const { title, description, categoryId, filename, tags } = req.body;
    
    // Get the file from the request
    const file = req.body.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Generate a unique path for the file
    const filePath = `${userId}/${uuidv4()}-${filename}`;
    
    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }
    
    // Determine file type
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
    
    // Create document record in database
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        title,
        description,
        file_name: filename,
        file_type: fileType,
        file_path: filePath,
        file_size: file.size,
        category_id: categoryId,
        tags,
        created_by: userId,
        user_id: userId
      })
      .select()
      .single();
    
    if (documentError) {
      console.error('Error creating document record:', documentError);
      
      // Try to clean up the uploaded file
      await supabase.storage
        .from('documents')
        .remove([filePath]);
      
      return res.status(500).json({ error: 'Failed to create document record' });
    }
    
    // Return success with document data
    return res.status(200).json({
      id: documentData.id,
      filePath,
      message: 'Document uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error handling upload:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An error occurred during upload' 
    });
  }
}