/*
  # Recreate Backup Storage Policies with Proper Configuration
  
  1. Changes
    - Drop all existing backup-related policies
    - Recreate with simpler, more permissive policies
    - Use anon and authenticated roles
  
  2. Security
    - Allow authenticated users full access to backups bucket
    - Allow anonymous users to potentially trigger backups too
*/

-- Drop all existing backup policies
DROP POLICY IF EXISTS "Authenticated users can upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete backups" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update backups" ON storage.objects;

-- Create new policies with both anon and authenticated access
CREATE POLICY "Allow authenticated uploads to backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Allow anon uploads to backups"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Allow authenticated select from backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'backups');

CREATE POLICY "Allow anon select from backups"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'backups');

CREATE POLICY "Allow authenticated delete from backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'backups');

CREATE POLICY "Allow anon delete from backups"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'backups');

CREATE POLICY "Allow authenticated update to backups"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');

CREATE POLICY "Allow anon update to backups"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');