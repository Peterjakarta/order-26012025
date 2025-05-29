-- First, ensure proper RLS policies are set for the documents table
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;

-- Create the policy for document insertion
CREATE POLICY "Authenticated users can insert documents" 
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update any other policies that might need adjustment
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents" 
ON public.documents
FOR UPDATE
TO authenticated
USING (true) 
WITH CHECK (true);

-- Make sure SELECT policy exists
DROP POLICY IF EXISTS "Authenticated users can read documents" ON public.documents;
CREATE POLICY "Authenticated users can read documents" 
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Make sure DELETE policy exists
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents" 
ON public.documents
FOR DELETE
TO authenticated
USING (true);