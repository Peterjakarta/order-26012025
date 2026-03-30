/*
  # Add GitHub Repository Settings

  1. Changes
    - Add github_owner and github_repo columns to settings table
    - Insert default values for GitHub settings
  
  2. Purpose
    - Store GitHub repository information for automatic version syncing
    - Allow users to configure their repository details
*/

-- Add GitHub settings if they don't exist
INSERT INTO settings (key, value) 
VALUES ('github_owner', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) 
VALUES ('github_repo', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) 
VALUES ('github_branch', 'main')
ON CONFLICT (key) DO NOTHING;
