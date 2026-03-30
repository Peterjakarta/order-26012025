/*
  # Fix Backup Storage RLS Policies
  
  1. Changes
    - Update bucket to be public with RLS
    - Add proper storage policies for all authenticated users
  
  2. Security
    - All authenticated users can create, view, and delete backups
    - Policies control access through authentication
*/

-- Update the bucket to be public (RLS will handle security)
UPDATE storage.buckets
SET public = true
WHERE id = 'backups';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update backups" ON storage.objects;

-- Create storage policies for authenticated users
CREATE POLICY "Authenticated users can upload backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backups'
);

CREATE POLICY "Authenticated users can view backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups'
);

CREATE POLICY "Authenticated users can delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'backups'
);

CREATE POLICY "Authenticated users can update backups"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'backups'
)
WITH CHECK (
  bucket_id = 'backups'
);