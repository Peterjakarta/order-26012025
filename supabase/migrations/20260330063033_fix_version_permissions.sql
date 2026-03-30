/*
  # Fix Version Table Permissions

  1. Changes
    - Update RLS policies on versions table to allow all authenticated users to insert/update/delete
    - Remove the requirement for 'manage_users' permission
  
  2. Security
    - Keep RLS enabled
    - Allow authenticated users full access to manage versions
    - Keep read access for all authenticated users
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can insert versions" ON versions;
DROP POLICY IF EXISTS "Admins can update versions" ON versions;
DROP POLICY IF EXISTS "Admins can delete versions" ON versions;

-- Create new permissive policies for authenticated users
CREATE POLICY "Authenticated users can insert versions"
  ON versions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update versions"
  ON versions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete versions"
  ON versions
  FOR DELETE
  TO authenticated
  USING (true);
