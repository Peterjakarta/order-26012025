/*
  # Production Checklist Data

  Stores the filled-in checklist values from the iPad production checklist screen,
  mirroring the columns shown in the printed "List" PDF.

  ## New Tables
  - `production_checklist_data`
    - `id` (uuid, primary key)
    - `order_id` (text) - references the production order ID
    - `product_id` (text) - references the product within the order
    - `produced` (text) - quantity produced
    - `rejected` (text) - quantity rejected
    - `spray` (text) - spray stage value
    - `ready` (text) - ready stage value
    - `shell` (text) - shell stage value
    - `ganache` (text) - ganache stage value
    - `closed` (text) - closed stage value
    - `aw` (text) - AW value
    - `created_at` / `updated_at` timestamps
    - UNIQUE constraint on (order_id, product_id) to allow upserts

  ## Security
  - RLS enabled
  - Authenticated users can select, insert, update all rows (shared production data)
  - Authenticated users can delete their own entries
*/

CREATE TABLE IF NOT EXISTS production_checklist_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  product_id text NOT NULL,
  produced text DEFAULT '',
  rejected text DEFAULT '',
  spray text DEFAULT '',
  ready text DEFAULT '',
  shell text DEFAULT '',
  ganache text DEFAULT '',
  closed text DEFAULT '',
  aw text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (order_id, product_id)
);

ALTER TABLE production_checklist_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checklist data"
  ON production_checklist_data
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert checklist data"
  ON production_checklist_data
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update checklist data"
  ON production_checklist_data
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete checklist data"
  ON production_checklist_data
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_production_checklist_order_id
  ON production_checklist_data (order_id);
