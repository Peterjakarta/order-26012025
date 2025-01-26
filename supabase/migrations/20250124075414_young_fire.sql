/*
  # Create users table and auth schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password_hash` (text)
      - `role` (text)
      - `permissions` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  permissions text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Only admins can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'manage_users' = ANY(permissions)
    )
  );

-- Insert default admin user
INSERT INTO users (username, password_hash, role, permissions)
VALUES (
  'admin',
  '$2a$10$xJ8Yg5xK8Yx8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8',
  'admin',
  ARRAY['manage_users', 'manage_orders', 'manage_products', 'create_orders']
)
ON CONFLICT (username) DO NOTHING;

-- Insert default staff user
INSERT INTO users (username, password_hash, role, permissions)
VALUES (
  'staff',
  '$2a$10$xJ8Yg5xK8Yx8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8J9q8',
  'staff',
  ARRAY['create_orders']
)
ON CONFLICT (username) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();