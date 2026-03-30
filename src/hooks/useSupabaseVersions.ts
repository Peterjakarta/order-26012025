import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface VersionCommit {
  id: string;
  version_id: string;
  title: string;
  description?: string;
  author: string;
  commit_date: string;
  category: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  created_at: string;
}

export interface Version {
  id: string;
  version: string;
  release_date: string;
  is_current: boolean;
  notes?: string;
  created_at: string;
  created_by: string;
  commits?: VersionCommit[];
}

export function useSupabaseVersions() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all versions
      const { data: versionsData, error: versionsError } = await supabase
        .from('versions')
        .select('*')
        .order('release_date', { ascending: false });

      if (versionsError) throw versionsError;

      if (!versionsData || versionsData.length === 0) {
        setVersions([]);
        setCurrentVersion(null);
        setLoading(false);
        return;
      }

      // Fetch commits for each version
      const versionsWithCommits: Version[] = [];

      for (const version of versionsData) {
        const { data: commitsData, error: commitsError } = await supabase
          .from('version_commits')
          .select('*')
          .eq('version_id', version.id)
          .order('commit_date', { ascending: false });

        if (commitsError) {
          console.error('Error fetching commits:', commitsError);
        }

        const versionWithCommits: Version = {
          ...version,
          commits: commitsData || [],
        };

        versionsWithCommits.push(versionWithCommits);

        if (version.is_current) {
          setCurrentVersion(versionWithCommits);
        }
      }

      setVersions(versionsWithCommits);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load version information');
      setLoading(false);
    }
  }, []);

  const syncWithGitHub = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      // Get GitHub settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['github_owner', 'github_repo', 'github_branch']);

      if (settingsError) throw settingsError;

      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      const owner = settingsMap.github_owner;
      const repo = settingsMap.github_repo;
      const branch = settingsMap.github_branch || 'main';

      if (!owner || !repo) {
        throw new Error('GitHub repository not configured. Please set GitHub owner and repo in settings.');
      }

      // Call edge function to sync
      const { data, error } = await supabase.functions.invoke('sync-github-commits', {
        body: { owner, repo, branch },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to sync with GitHub');
      }

      // Refresh versions after sync
      await fetchVersions();

      setSyncing(false);
      return data;
    } catch (err) {
      console.error('Error syncing with GitHub:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync with GitHub');
      setSyncing(false);
      throw err;
    }
  }, [fetchVersions]);

  const updateGitHubSettings = useCallback(async (owner: string, repo: string, branch: string = 'main') => {
    try {
      const updates = [
        { key: 'github_owner', value: owner },
        { key: 'github_repo', value: repo },
        { key: 'github_branch', value: branch },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error updating GitHub settings:', err);
      throw err;
    }
  }, []);

  const getGitHubSettings = useCallback(async () => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['github_owner', 'github_repo', 'github_branch']);

      if (error) throw error;

      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      return {
        owner: settingsMap.github_owner || '',
        repo: settingsMap.github_repo || '',
        branch: settingsMap.github_branch || 'main',
      };
    } catch (err) {
      console.error('Error getting GitHub settings:', err);
      return { owner: '', repo: '', branch: 'main' };
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    currentVersion,
    loading,
    error,
    syncing,
    syncWithGitHub,
    updateGitHubSettings,
    getGitHubSettings,
    refetch: fetchVersions,
  };
}
