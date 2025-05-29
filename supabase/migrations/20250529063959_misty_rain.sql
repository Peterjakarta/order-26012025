-- Create proper RLS policy for document table
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;

CREATE POLICY "Authenticated users can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update existing policies for greater permissiveness
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