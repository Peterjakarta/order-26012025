/*
  # Fix Production Checklist RLS Policies

  The app operates primarily with the Supabase anon key (no per-user JWT auth),
  so the existing policies requiring `authenticated` role are blocking all writes.

  ## Changes
  - Drop the `authenticated`-only policies on `production_checklist_data`
  - Replace with policies that allow the `anon` role (app uses anon key)
  - All four operations (SELECT, INSERT, UPDATE, DELETE) are opened to anon
    role so the production checklist screen can read and persist data
*/

DROP POLICY IF EXISTS "Authenticated users can view checklist data" ON production_checklist_data;
DROP POLICY IF EXISTS "Authenticated users can insert checklist data" ON production_checklist_data;
DROP POLICY IF EXISTS "Authenticated users can update checklist data" ON production_checklist_data;
DROP POLICY IF EXISTS "Authenticated users can delete checklist data" ON production_checklist_data;

CREATE POLICY "App can view checklist data"
  ON production_checklist_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "App can insert checklist data"
  ON production_checklist_data
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "App can update checklist data"
  ON production_checklist_data
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "App can delete checklist data"
  ON production_checklist_data
  FOR DELETE
  TO anon, authenticated
  USING (true);
