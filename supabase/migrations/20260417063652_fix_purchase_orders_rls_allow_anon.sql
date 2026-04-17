/*
  # Fix Purchase Orders RLS Policies

  The app operates with the Supabase anon key (no per-user JWT auth via Supabase),
  so policies restricted to `authenticated` role block all operations.

  ## Changes
  - Drop existing authenticated-only policies on purchase_orders
  - Replace with policies that allow both anon and authenticated roles
*/

DROP POLICY IF EXISTS "Authenticated users can read purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can insert purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase orders" ON purchase_orders;

CREATE POLICY "Allow read purchase orders"
  ON purchase_orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert purchase orders"
  ON purchase_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update purchase orders"
  ON purchase_orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
