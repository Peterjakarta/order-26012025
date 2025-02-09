import React from 'react';
import { Info, GitBranch, Calendar } from 'lucide-react';
import packageJson from '../../../../package.json';

export default function VersionInfo() {
  const version = packageJson.version;
  const commitRef = import.meta.env.VITE_COMMIT_REF || 'Not available';
  const commitMessage = import.meta.env.VITE_COMMIT_MESSAGE || 'No message available';
  const context = import.meta.env.VITE_CONTEXT || 'development';
  const deployUrl = import.meta.env.VITE_URL || 'localhost';
  const deployTime = import.meta.env.VITE_DEPLOY_TIME || new Date().toISOString();

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
          <div className="text-sm text-gray-600">
            <div className="flex flex-col gap-1">
              <div>Latest commit: <span className="font-mono">{commitRef}</span></div>
              <div>Message: {commitMessage}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p>Environment: {context}</p>
            <p>Deploy URL: {deployUrl}</p>
            <p>Last Deploy: {new Date(deployTime).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}