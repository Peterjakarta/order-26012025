/*
  # Fix RLS Security and Performance Issues

  This migration addresses multiple security and performance issues identified by Supabase:

  ## 1. RLS Policy Performance Optimization
  
  Optimizes auth function calls in RLS policies by wrapping them with SELECT to prevent
  re-evaluation for each row:
  
  - `public.settings` - "Only authenticated users can update settings"
  - `public.users` - "Users can read own data", "Only admins can manage users"  
  - `public.version_commits` - All admin policies

  ## 2. RLS Policy Security Fixes
  
  Fixes overly permissive RLS policies on `public.versions` table that allowed unrestricted
  access to all authenticated users. Restricts version management to admin users only.

  ## 3. Multiple Permissive Policies Resolution
  
  Consolidates multiple SELECT policies on `public.users` table into a single optimized policy.

  ## 4. Function Security
  
  Fixes mutable search_path vulnerability in `public.update_updated_at_column` function.

  ## 5. Database Optimization
  
  Removes unused indexes that are not being utilized:
  - `idx_versions_current`
  - `idx_version_commits_version_id`
  - `idx_version_commits_date`
*/

-- ============================================================================
-- 1. Fix Function Search Path Vulnerability
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Optimize Settings Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Only authenticated users can update settings" ON public.settings;

CREATE POLICY "Only authenticated users can update settings"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING ((select auth.role()) = 'authenticated')
  WITH CHECK ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 3. Optimize and Consolidate Users Table RLS Policies
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Only admins can manage users" ON public.users;

-- Create a single consolidated SELECT policy (restrictive)
CREATE POLICY "Users can view own data or admins can view all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) = id)
    OR
    (EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    ))
  );

-- Recreate admin management policy for INSERT, UPDATE, DELETE
CREATE POLICY "Only admins can manage users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

-- ============================================================================
-- 4. Optimize Version Commits Table RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert commits" ON public.version_commits;
DROP POLICY IF EXISTS "Admins can update commits" ON public.version_commits;
DROP POLICY IF EXISTS "Admins can delete commits" ON public.version_commits;

CREATE POLICY "Admins can insert commits"
  ON public.version_commits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can update commits"
  ON public.version_commits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Admins can delete commits"
  ON public.version_commits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

-- ============================================================================
-- 5. Fix Overly Permissive Versions Table RLS Policies
-- ============================================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can update versions" ON public.versions;
DROP POLICY IF EXISTS "Authenticated users can delete versions" ON public.versions;

-- Create restrictive policies that only allow admins to modify versions
CREATE POLICY "Only admins can insert versions"
  ON public.versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Only admins can update versions"
  ON public.versions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

CREATE POLICY "Only admins can delete versions"
  ON public.versions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
      AND 'manage_users' = ANY(users.permissions)
    )
  );

-- ============================================================================
-- 6. Remove Unused Indexes
-- ============================================================================

-- These indexes have not been used and can be safely removed
DROP INDEX IF EXISTS public.idx_versions_current;
DROP INDEX IF EXISTS public.idx_version_commits_version_id;
DROP INDEX IF EXISTS public.idx_version_commits_date;
