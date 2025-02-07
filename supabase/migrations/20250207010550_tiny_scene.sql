/*
  # Add Stock Category Items

  1. New Tables
    - `stock_category_items`
      - `category_id` (uuid, references stock_categories)
      - `ingredient_id` (uuid, references ingredients)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `stock_category_items` table
    - Add policies for authenticated users
*/

-- Create stock category items table
CREATE TABLE IF NOT EXISTS stock_category_items (
  category_id uuid REFERENCES stock_categories(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (category_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE stock_category_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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