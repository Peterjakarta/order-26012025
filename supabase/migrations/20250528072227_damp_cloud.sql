/*
  # Create documentation management tables
  
  1. New Tables
    - `document_categories`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
    
    - `documents`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text)
      - `file_name` (text, not null)
      - `file_type` (text, not null)
      - `file_path` (text, not null)
      - `file_size` (integer, not null)
      - `category_id` (uuid, references document_categories)
      - `tags` (text array)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create document categories table
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  tags text[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for document_categories
CREATE POLICY "Authenticated users can read document_categories"
  ON document_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert document_categories"
  ON document_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own document_categories"
  ON document_categories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own document_categories"
  ON document_categories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create policies for documents
CREATE POLICY "Authenticated users can read documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create updated_at triggers
CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO document_categories (name, description) 
VALUES 
  ('SOP', 'Standard Operating Procedures'),
  ('Meeting Notes', 'Meeting minutes, agendas, and presentations'),
  ('Approval Forms', 'Forms for product approvals and other processes'),
  ('General', 'General documentation and references')
ON CONFLICT DO NOTHING;