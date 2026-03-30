/*
  # Create Backup Storage Bucket
  
  1. Storage Setup
    - Creates a 'backups' storage bucket for automated daily backups
    - Configured for private access (public = false)
  
  2. Security
    - Bucket is private, requiring authentication
    - Access control handled at application level through service role
  
  3. Notes
    - Backups are stored as JSON files with timestamp naming
    - Each backup is named: backup_YYYY-MM-DD_HH-mm-ss.json
    - Old backups (>30 days) can be automatically cleaned up
    - 10MB file size limit per backup
*/

-- Create the backups bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  10485760, -- 10MB limit per backup file
  ARRAY['application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;