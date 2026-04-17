/*
  # Create purchase_orders table

  ## Summary
  Migrates purchase order data storage from Firebase Firestore to Supabase.

  ## New Tables

  ### purchase_orders
  Stores purchase order headers with supplier details, dates, status, and line items.

  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `reference` (text) - PO reference number (e.g. PO-2026-001)
  - `supplier` (text) - Supplier name
  - `order_date` (text) - Order date (ISO date string)
  - `expected_date` (text, nullable) - Expected delivery date
  - `notes` (text, nullable) - Additional notes
  - `status` (text) - One of: draft, ordered, partial, received, cancelled
  - `items` (jsonb) - Array of line items (ingredientId, name, unit, qty ordered/received)
  - `closed_at` (text, nullable) - ISO timestamp when order was closed
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, update all purchase orders
  - No delete policy (orders should be cancelled, not deleted)
*/

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  supplier text NOT NULL DEFAULT '',
  order_date text NOT NULL DEFAULT '',
  expected_date text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  closed_at text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase orders"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx ON purchase_orders(created_at DESC);
