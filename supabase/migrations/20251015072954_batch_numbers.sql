/*
  # HACCP Batch Numbers Tracking

  1. New Tables
    - `batch_numbers`
      - `id` (uuid, primary key)
      - `batch_number` (text, unique) - The batch number identifier
      - `batch_date` (date) - Date of batch creation
      - `product_name` (text) - Name of the product
      - `product_id` (uuid, nullable) - Reference to products table if linked
      - `order_id` (uuid, nullable) - Reference to orders table if from completed order
      - `quantity` (numeric) - Quantity produced
      - `unit` (text) - Unit of measurement (kg, pcs, etc)
      - `expiry_date` (date, nullable) - Product expiry date
      - `production_notes` (text, nullable) - Additional production notes
      - `status` (text) - Status: active, expired, recalled
      - `created_by` (text) - User who created the batch
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on batch_numbers table
    - Authenticated users can read all batches
    - Only authenticated users can create/update/delete batches
*/

CREATE TABLE IF NOT EXISTS batch_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  product_name text NOT NULL,
  product_id uuid,
  order_id uuid,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  expiry_date date,
  production_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'recalled')),
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_numbers_batch_date ON batch_numbers(batch_date DESC);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_product_name ON batch_numbers(product_name);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_status ON batch_numbers(status);
CREATE INDEX IF NOT EXISTS idx_batch_numbers_order_id ON batch_numbers(order_id);

-- Enable RLS
ALTER TABLE batch_numbers ENABLE ROW LEVEL SECURITY;

-- Policies for batch_numbers table
CREATE POLICY "Authenticated users can read batch numbers"
  ON batch_numbers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert batch numbers"
  ON batch_numbers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update batch numbers"
  ON batch_numbers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete batch numbers"
  ON batch_numbers FOR DELETE
  TO authenticated
  USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_batch_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS batch_numbers_updated_at ON batch_numbers;
CREATE TRIGGER batch_numbers_updated_at
  BEFORE UPDATE ON batch_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_numbers_updated_at();
