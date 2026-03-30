import { supabase } from '../lib/supabase';

export interface GitHubSettings {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

export async function getGitHubSettings(): Promise<GitHubSettings | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['github_owner', 'github_repo', 'github_branch', 'github_token']);

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const settings: any = {};
    data.forEach((item) => {
      const key = item.key.replace('github_', '');
      settings[key] = item.value;
    });

    if (!settings.owner || !settings.repo || !settings.token) {
      return null;
    }

    return {
      owner: settings.owner,
      repo: settings.repo,
      branch: settings.branch || 'main',
      token: settings.token,
    };
  } catch (error) {
    console.error('Error getting GitHub settings:', error);
    return null;
  }
}

export async function saveGitHubSettings(settings: GitHubSettings): Promise<void> {
  try {
    const updates = [
      { key: 'github_owner', value: settings.owner },
      { key: 'github_repo', value: settings.repo },
      { key: 'github_branch', value: settings.branch },
      { key: 'github_token', value: settings.token },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert(update, { onConflict: 'key' });

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error saving GitHub settings:', error);
    throw error;
  }
}

export async function testGitHubConnection(settings: GitHubSettings): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${settings.owner}/${settings.repo}`,
      {
        headers: {
          Authorization: `token ${settings.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error testing GitHub connection:', error);
    return false;
  }
}

export async function pushCodeToGitHub(
  commitMessage: string = 'Automated code backup'
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    const settings = await getGitHubSettings();

    if (!settings) {
      return {
        success: false,
        message: 'GitHub not configured. Please set up your repository settings first.',
      };
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-code-backup`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: settings.owner,
        repo: settings.repo,
        branch: settings.branch,
        token: settings.token,
        commitMessage,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to push code to GitHub');
    }

    return {
      success: true,
      message: 'Code successfully backed up to GitHub',
      url: result.commit_url,
    };
  } catch (error) {
    console.error('Error pushing code to GitHub:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to backup code',
    };
  }
}

export function downloadProjectAsZip(): void {
  const projectFiles = {
    'package.json': '/* Package.json content */',
    'README.md': '/* README content */',
    'src/App.tsx': '/* App.tsx content */',
  };

  const blob = new Blob(
    [JSON.stringify(projectFiles, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `code-backup-${new Date().toISOString()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
