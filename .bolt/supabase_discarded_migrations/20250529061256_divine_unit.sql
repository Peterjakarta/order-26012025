-- Fix document upload permissions and storage policies

-- First, ensure proper RLS policies are set for the documents table
CREATE POLICY IF NOT EXISTS "Authenticated users can insert documents" 
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create or update the documents storage bucket
DO $$
DECLARE 
  bucket_exists BOOLEAN;
BEGIN
  -- Check if the bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'documents'
  ) INTO bucket_exists;
  
  -- Create the bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    VALUES ('documents', 'documents', false, false, 10485760, 
      ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']::text[]);
  ELSE
    -- Update the bucket to ensure it's not public
    UPDATE storage.buckets
    SET public = false
    WHERE name = 'documents' AND public = true;
  END IF;
END
$$;

-- Create storage bucket policies using the correct API
-- These policies will be created through the Supabase API in the application code
-- rather than directly in SQL, as the storage.policies table structure may vary

-- Update the documents table to ensure created_by can be null (for compatibility)
ALTER TABLE public.documents 
  ALTER COLUMN created_by DROP NOT NULL;

-- Modify the documents table RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Authenticated users can update documents" 
ON public.documents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete documents" 
ON public.documents
FOR DELETE
TO authenticated
USING (true);