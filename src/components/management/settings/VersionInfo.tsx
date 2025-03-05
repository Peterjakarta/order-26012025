import React, { useState, useEffect } from 'react';
import { Info, GitBranch, Calendar, GitCommit, ChevronDown, ChevronRight } from 'lucide-react';
import packageJson from '../../../../package.json';

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export default function VersionInfo() {
  const version = packageJson.version;
  const commitRef = import.meta.env.VITE_COMMIT_REF || 'Not available';
  const commitMessage = import.meta.env.VITE_COMMIT_MESSAGE || 'No message available';
  const context = import.meta.env.VITE_CONTEXT || 'development';
  const deployUrl = import.meta.env.VITE_URL || 'localhost';
  const deployTime = import.meta.env.VITE_DEPLOY_TIME || new Date().toISOString();
  const [showCommits, setShowCommits] = useState(false);

  // Mock commits data - in a real app this would come from your CI/CD system
  const [commits, setCommits] = useState<Commit[]>([
    {
      hash: commitRef,
      message: commitMessage,
      author: 'System',
      date: new Date().toISOString()
    }
  ]);

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
            <p>Environment: {context}</p>
            <p>Deploy URL: {deployUrl}</p>
            <p>Last Deploy: {new Date(deployTime).toLocaleString()}</p>
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