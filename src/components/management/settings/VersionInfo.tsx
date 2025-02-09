import React from 'react';
import { Info, GitBranch, Calendar } from 'lucide-react';

export default function VersionInfo() {
  const version = import.meta.env.VITE_APP_VERSION || 'Not available';
  const deploymentDate = import.meta.env.VITE_APP_DEPLOYMENT_DATE || 'Not available';
  const commitMessage = import.meta.env.VITE_APP_COMMIT_MESSAGE || 'Not available';

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
            <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
              version === 'Not available' 
                ? 'bg-gray-100 text-gray-600' 
                : 'bg-purple-100 text-purple-800'
            }`}>
              {version}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Latest commit: {commitMessage}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium">Deployment Date</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
              deploymentDate === 'Not available' 
                ? 'bg-gray-100 text-gray-600' 
                : 'bg-purple-100 text-purple-800'
            }`}>
              {deploymentDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}