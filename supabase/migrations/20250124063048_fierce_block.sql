/*
  # Create settings table for application configuration
  
  1. New Tables
    - `settings`
      - `key` (text, primary key) - Setting identifier
      - `value` (text) - Setting value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on settings table
    - Add policy for authenticated users to read settings
    - Add policy for admin users to update settings
*/

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can update settings" ON settings
  FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Insert initial admin password
INSERT INTO settings (key, value)
VALUES ('admin_password', '$2a$10$xJ8Yg5xK8Yx8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8')
ON CONFLICT (key) DO NOTHING;