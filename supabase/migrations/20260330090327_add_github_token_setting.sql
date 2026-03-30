/*
  # Add GitHub Token Setting

  1. Changes
    - Add github_token setting to settings table for GitHub API authentication
  
  2. Purpose
    - Store encrypted GitHub personal access token
    - Enable automated code backups to GitHub
  
  3. Security
    - Token should be encrypted before storage
    - Only accessible by admin users
*/

-- Add GitHub token setting if it doesn't exist
INSERT INTO settings (key, value) 
VALUES ('github_token', '')
ON CONFLICT (key) DO NOTHING;
