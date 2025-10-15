/*
  # Version Tracking System

  1. New Tables
    - `versions`
      - `id` (uuid, primary key)
      - `version` (text) - Semantic version number (e.g., 1.2.3)
      - `release_date` (timestamptz) - When this version was released
      - `is_current` (boolean) - Whether this is the current active version
      - `notes` (text) - Release notes
      - `created_at` (timestamptz)
      - `created_by` (text) - User who created this version entry

    - `version_commits`
      - `id` (uuid, primary key)
      - `version_id` (uuid, foreign key)
      - `title` (text) - Short commit message
      - `description` (text) - Detailed description
      - `author` (text) - Who made the change
      - `commit_date` (timestamptz)
      - `category` (text) - Type of change (feature, bugfix, enhancement, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Everyone can read
    - Only authenticated users with manage_users permission can write
*/

-- Create versions table
CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  release_date timestamptz DEFAULT now(),
  is_current boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text
);

-- Create version_commits table
CREATE TABLE IF NOT EXISTS version_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid REFERENCES versions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  author text,
  commit_date timestamptz DEFAULT now(),
  category text DEFAULT 'feature',
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_versions_current ON versions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_version_commits_version_id ON version_commits(version_id);
CREATE INDEX IF NOT EXISTS idx_version_commits_date ON version_commits(commit_date DESC);

-- Enable RLS
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_commits ENABLE ROW LEVEL SECURITY;

-- Policies for versions table
CREATE POLICY "Anyone can view versions"
  ON versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert versions"
  ON versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can update versions"
  ON versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can delete versions"
  ON versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

-- Policies for version_commits table
CREATE POLICY "Anyone can view commits"
  ON version_commits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert commits"
  ON version_commits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can update commits"
  ON version_commits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can delete commits"
  ON version_commits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'manage_users' = ANY(users.permissions)
    )
  );

-- Insert initial version
INSERT INTO versions (version, release_date, is_current, notes, created_by)
VALUES (
  '1.0.0',
  now(),
  true,
  'Initial release with core features',
  'system'
) ON CONFLICT (version) DO NOTHING;

-- Get the version ID for sample commits
DO $$
DECLARE
  v_version_id uuid;
BEGIN
  SELECT id INTO v_version_id FROM versions WHERE version = '1.0.0';

  -- Insert sample commits for initial version
  INSERT INTO version_commits (version_id, title, description, author, category, commit_date)
  VALUES
    (v_version_id, 'Initial System Setup', 'Set up the base application structure with authentication and user management', 'System', 'feature', now() - interval '30 days'),
    (v_version_id, 'Order Management System', 'Complete order management system with create, update, and completion workflows', 'System', 'feature', now() - interval '25 days'),
    (v_version_id, 'Product & Category Management', 'Full product catalog with categories, pricing, and inventory tracking', 'System', 'feature', now() - interval '20 days'),
    (v_version_id, 'Recipe Management', 'Recipe creation and management with ingredient tracking', 'System', 'feature', now() - interval '15 days'),
    (v_version_id, 'Stock Management', 'Ingredient stock tracking with history and alerts', 'System', 'feature', now() - interval '10 days'),
    (v_version_id, 'Production Planning', 'Production scheduling and planning features', 'System', 'feature', now() - interval '7 days'),
    (v_version_id, 'Enhanced Logbook', 'Comprehensive activity logging across all system operations', 'System', 'feature', now() - interval '2 days'),
    (v_version_id, 'Performance Improvements', 'Optimized database queries and improved UI responsiveness', 'System', 'enhancement', now() - interval '1 day');
END $$;
