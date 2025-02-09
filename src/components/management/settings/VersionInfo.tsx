import React, { useState, useEffect } from 'react';
import { Info, Calendar, GitCommit } from 'lucide-react';
import { version } from '../../../../package.json';

interface VersionInfo {
  version: string;
  deploymentDate: string;
  commitMessage: string;
}

export default function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: version || '0.0.0',
    deploymentDate: new Date().toISOString(),
    commitMessage: 'Development build'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVersionInfo = async () => {
      try {
        // In development, use the default values
        if (import.meta.env.DEV) {
          setVersionInfo({
            version: version || '0.0.0',
            deploymentDate: new Date().toISOString(),
            commitMessage: 'Development build'
          });
          return;
        }

        // In production, try to load version.json
        const response = await fetch('/version.json');
        if (!response.ok) {
          throw new Error('Failed to load version information');
        }
        const data = await response.json();
        setVersionInfo(data);
      } catch (err) {
        console.error('Error loading version info:', err);
        // Don't show error since we have fallback values
      } finally {
        setLoading(false);
      }
    };

    loadVersionInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-400">Loading version information...</div>
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

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Version
            </label>
            <p className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {versionInfo.version}
              {import.meta.env.DEV && ' (Development)'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Deployment Date
            </label>
            <p className="text-gray-900">
              {new Date(versionInfo.deploymentDate).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
              <GitCommit className="w-4 h-4" />
              Latest Commit
            </label>
            <p className="text-gray-900 font-mono text-sm bg-gray-50 p-3 rounded-lg">
              {versionInfo.commitMessage}
            </p>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
              Note: You are viewing the development version. Version information will be updated during production builds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}