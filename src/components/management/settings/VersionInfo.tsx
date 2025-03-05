import React, { useState, useEffect } from 'react';
import { Info, GitBranch, Calendar, GitCommit, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import packageJson from '../../../../package.json';

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

const TIMEOUT_DURATION = 5000; // 5 seconds timeout

export default function VersionInfo() {
  const version = packageJson.version;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommits, setShowCommits] = useState(false);
  const [versionData, setVersionData] = useState({
    commitRef: 'Not available',
    commitMessage: 'No message available',
    context: 'development',
    deployUrl: 'localhost',
    deployTime: new Date().toISOString()
  });

  // Load version information with timeout
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

    const loadVersionInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get environment variables with timeout protection
        setVersionData({
          commitRef: import.meta.env.VITE_COMMIT_REF || 'Not available',
          commitMessage: import.meta.env.VITE_COMMIT_MESSAGE || 'No message available',
          context: import.meta.env.VITE_CONTEXT || 'development',
          deployUrl: import.meta.env.VITE_URL || 'localhost',
          deployTime: import.meta.env.VITE_DEPLOY_TIME || new Date().toISOString()
        });

      } catch (err) {
        console.error('Error loading version info:', err);
        setError('Failed to load version information. Please try again.');
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    loadVersionInfo();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Mock commits data - in a real app this would come from your CI/CD system
  const commits: Commit[] = [
    {
      hash: versionData.commitRef,
      message: versionData.commitMessage,
      author: 'System',
      date: new Date().toISOString()
    }
  ];

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading version information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Info className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Version Information</h2>
          <p className="text-sm text-gray-600 mt-1">
            Details about the current deployment
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium">Version</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {version}
            </span>
          </div>
          
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>Environment: {versionData.context}</p>
            <p>Deploy URL: {versionData.deployUrl}</p>
            <p>Last Deploy: {new Date(versionData.deployTime).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border space-y-3">
          <button
            onClick={() => setShowCommits(!showCommits)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium">Commits</h3>
            </div>
            {showCommits ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showCommits && (
            <div className="space-y-4 mt-2">
              {commits.map((commit, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm"
                >
                  <div className="flex items-center gap-2 font-mono text-purple-600">
                    <GitCommit className="w-4 h-4" />
                    {commit.hash.slice(0, 7)}
                  </div>
                  <p className="text-gray-700">{commit.message}</p>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>{commit.author}</span>
                    <span>{new Date(commit.date).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}