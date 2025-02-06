/*
  # Stock Categories Implementation
  
  1. New Tables
    - `stock_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `stock_category_items`
      - `category_id` (uuid, foreign key)
      - `ingredient_id` (uuid, foreign key)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create stock categories table
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create junction table for ingredients and categories
CREATE TABLE IF NOT EXISTS stock_category_items (
  category_id uuid REFERENCES stock_categories(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (category_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_category_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for stock_categories
CREATE POLICY "Authenticated users can read stock categories"
  ON stock_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users with manage_products can manage stock categories"
  ON stock_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'manage_products' = ANY(permissions)
    )
  );

-- Add RLS policies for stock_category_items
CREATE POLICY "Authenticated users can read stock category items"
  ON stock_category_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users with manage_products can manage stock category items"
  ON stock_category_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND 'manage_products' = ANY(permissions)
    )
  );

-- Create updated_at trigger for stock_categories
CREATE TRIGGER update_stock_categories_updated_at
  BEFORE UPDATE ON stock_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();