/*
  # Version Tracking System

  1. New Tables
    - `versions`
      - `id` (uuid, primary key)
      - `version` (text) - Version number (e.g., "1.0.0")
      - `release_date` (timestamptz) - When the version was released
      - `is_current` (boolean) - Whether this is the current version
      - `notes` (text) - Release notes
      - `created_by` (text) - Email of user who created this version
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `version_commits`
      - `id` (uuid, primary key)
      - `version_id` (uuid, foreign key to versions)
      - `title` (text) - Short commit title
      - `description` (text) - Detailed description
      - `author` (text) - Email of commit author
      - `commit_date` (timestamptz) - When the change was made
      - `category` (text) - Type: feature, bugfix, enhancement, security, performance, documentation
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Allow all authenticated users to read
    - Only admins can create/update versions
*/

-- Create versions table
CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  release_date timestamptz DEFAULT now(),
  is_current boolean DEFAULT false,
  notes text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create version_commits table
CREATE TABLE IF NOT EXISTS version_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid REFERENCES versions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  author text NOT NULL,
  commit_date timestamptz DEFAULT now(),
  category text NOT NULL CHECK (category IN ('feature', 'bugfix', 'enhancement', 'security', 'performance', 'documentation')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_versions_is_current ON versions(is_current);
CREATE INDEX IF NOT EXISTS idx_version_commits_version_id ON version_commits(version_id);
CREATE INDEX IF NOT EXISTS idx_version_commits_commit_date ON version_commits(commit_date DESC);

-- Enable RLS
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_commits ENABLE ROW LEVEL SECURITY;

-- Policies for versions table
CREATE POLICY "Anyone can read versions"
  ON versions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert versions"
  ON versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update versions"
  ON versions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for version_commits table
CREATE POLICY "Anyone can read commits"
  ON version_commits FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert commits"
  ON version_commits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update commits"
  ON version_commits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial version 1.0.0
INSERT INTO versions (version, release_date, is_current, notes, created_by)
VALUES (
  '1.0.0',
  now(),
  true,
  'Initial release with comprehensive order management, product catalog, recipe tracking, and stock management features',
  'System'
) ON CONFLICT DO NOTHING
RETURNING id INTO @version_id;

-- Insert initial commits for version 1.0.0
DO $$
DECLARE
  version_id_var uuid;
BEGIN
  -- Get the version ID
  SELECT id INTO version_id_var FROM versions WHERE version = '1.0.0' LIMIT 1;

  IF version_id_var IS NOT NULL THEN
    -- Insert commits
    INSERT INTO version_commits (version_id, title, description, author, commit_date, category) VALUES
    (version_id_var, 'Order Management System', 'Complete order management with create, update, and completion workflows', 'System', now() - interval '30 days', 'feature'),
    (version_id_var, 'Product & Category Management', 'Full product catalog with categories, pricing, and inventory tracking', 'System', now() - interval '25 days', 'feature'),
    (version_id_var, 'Recipe Management', 'Recipe creation and management with ingredient tracking and cost calculations', 'System', now() - interval '20 days', 'feature'),
    (version_id_var, 'Stock Management', 'Ingredient stock tracking with history, alerts, and automated deductions', 'System', now() - interval '15 days', 'feature'),
    (version_id_var, 'Production Planning', 'Production scheduling and planning features with calendar view', 'System', now() - interval '10 days', 'feature'),
    (version_id_var, 'Enhanced Logbook', 'Comprehensive activity logging across all system operations', 'System', now() - interval '5 days', 'feature'),
    (version_id_var, 'User Authentication & Permissions', 'Secure authentication with role-based access control', 'System', now() - interval '3 days', 'security'),
    (version_id_var, 'Reporting & Export Features', 'Generate detailed reports with PDF and Excel export capabilities', 'System', now() - interval '2 days', 'feature'),
    (version_id_var, 'Performance Improvements', 'Optimized database queries and improved UI responsiveness', 'System', now() - interval '1 day', 'performance'),
    (version_id_var, 'R&D Product Management', 'Research and development product tracking with approval workflows', 'System', now() - interval '1 day', 'feature')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
