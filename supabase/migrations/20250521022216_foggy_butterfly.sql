/*
  # R&D Module Implementation
  
  1. New Tables
    - `rd_categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `rd_products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `description` (text)
      - `unit` (text)
      - `min_order` (integer)
      - `quantity_step` (integer)
      - `price` (numeric)
      - `show_price` (boolean)
      - `show_description` (boolean)
      - `show_min_order` (boolean)
      - `show_unit` (boolean)
      - `development_date` (date)
      - `target_production_date` (date)
      - `status` (text)
      - `notes` (text)
      - `image_urls` (text[])
      - `cost_estimate` (numeric)
      - `recipe_ingredients` (jsonb)
      - `test_results` (jsonb)
      - `order_reference` (text)
      - `created_by` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create rd_categories table
CREATE TABLE IF NOT EXISTS rd_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rd_products table
CREATE TABLE IF NOT EXISTS rd_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  unit text,
  min_order integer,
  quantity_step integer,
  price numeric,
  show_price boolean DEFAULT false,
  show_description boolean DEFAULT false,
  show_min_order boolean DEFAULT false,
  show_unit boolean DEFAULT false,
  development_date date NOT NULL,
  target_production_date date,
  status text NOT NULL DEFAULT 'planning',
  notes text,
  image_urls text[],
  cost_estimate numeric,
  recipe_ingredients jsonb,
  test_results jsonb,
  order_reference text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rd_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_products ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for rd_categories
CREATE POLICY "Authenticated users can read rd_categories"
  ON rd_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rd_categories"
  ON rd_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rd_categories"
  ON rd_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rd_categories"
  ON rd_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Add RLS policies for rd_products
CREATE POLICY "Authenticated users can read rd_products"
  ON rd_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert rd_products"
  ON rd_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update rd_products"
  ON rd_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rd_products"
  ON rd_products
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rd_categories_updated_at
  BEFORE UPDATE ON rd_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rd_products_updated_at
  BEFORE UPDATE ON rd_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();