-- Fix RLS policies for document_categories and documents tables

-- Ensure proper RLS policies are set for the documents table
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;

CREATE POLICY "Authenticated users can insert documents" 
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

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