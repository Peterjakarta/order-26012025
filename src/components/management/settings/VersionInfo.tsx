import React, { useState } from 'react';
import { Info, Calendar, Loader2, Clock, Package2, GitCommitVertical as GitCommit, CheckCircle2, AlertCircle, Zap, Shield, FileText, Code2 } from 'lucide-react';
import { versions, type Version, type VersionCommit } from '../../../data/versions';
import packageJson from '../../../../package.json';

const categoryIcons: Record<VersionCommit['category'], React.ElementType> = {
  feature: Code2,
  bugfix: AlertCircle,
  enhancement: Zap,
  security: Shield,
  performance: Zap,
  documentation: FileText
};

const categoryColors: Record<VersionCommit['category'], string> = {
  feature: 'bg-blue-100 text-blue-700',
  bugfix: 'bg-red-100 text-red-700',
  enhancement: 'bg-purple-100 text-purple-700',
  security: 'bg-green-100 text-green-700',
  performance: 'bg-orange-100 text-orange-700',
  documentation: 'bg-gray-100 text-gray-700'
};

export default function VersionInfo() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([versions[0]?.version]));

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(version)) {
        newSet.delete(version);
      } else {
        newSet.add(version);
      }
      return newSet;
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const currentVersion = versions.find(v => v.isCurrent) || versions[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <GitCommit className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Version History</h2>
            <p className="text-sm text-gray-600">Automatically tracked from Git commits</p>
          </div>
        </div>
        {currentVersion && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">v{currentVersion.version}</span>
          </div>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No versions tracked yet</h3>
          <p className="text-gray-600 mb-4">Version history is automatically generated from Git commits during build</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mt-4 max-w-md mx-auto">
            <p className="text-sm text-blue-900 font-medium mb-2">To generate version history:</p>
            <code className="text-xs bg-white px-2 py-1 rounded block">npm run update-version</code>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <div key={version.version} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <button
                onClick={() => toggleVersion(version.version)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${version.isCurrent ? 'bg-pink-100' : 'bg-gray-100'}`}>
                      <Package2 className={`w-5 h-5 ${version.isCurrent ? 'text-pink-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">Version {version.version}</h3>
                        {version.isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(version.releaseDate)}</span>
                        <span className="mx-2">•</span>
                        <GitCommit className="w-4 h-4" />
                        <span>{version.commits.length} commits</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {expandedVersions.has(version.version) ? '▼' : '▶'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-800">{version.notes}</p>
                </div>
              </button>

              {expandedVersions.has(version.version) && version.commits.length > 0 && (
                <div className="px-6 pb-6 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <GitCommit className="w-4 h-4" />
                    Commit History
                  </h4>
                  {version.commits.map((commit, idx) => {
                    const Icon = categoryIcons[commit.category];
                    const colorClass = categoryColors[commit.category];
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className={`p-1.5 rounded ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{commit.title}</p>
                          {commit.description && (
                            <p className="text-xs text-gray-600 mt-1">{commit.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass} font-medium`}>
                              {commit.category}
                            </span>
                            <span className="text-xs text-gray-500">{commit.date}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-600" />
          System Information
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Application Name:</span>
            <span className="font-medium">{packageJson.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Package Version:</span>
            <span className="font-medium">{packageJson.version}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Environment:</span>
            <span className="font-medium capitalize">{import.meta.env.MODE}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Node Engine:</span>
            <span className="font-medium">{packageJson.engines.node}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Last Updated:</span>
            <span className="font-medium">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-sky-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium mb-3 text-blue-900 flex items-center gap-2">
          <Package2 className="w-4 h-4" />
          Key Features
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {['Order Management', 'Product Catalog', 'Recipe Management', 'Stock Tracking',
            'Production Planning', 'Activity Logging', 'User Management', 'R&D Products'].map(feature => (
            <div key={feature} className="flex items-center gap-2 text-blue-800">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              {feature}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <h3 className="font-medium mb-2 text-green-900 flex items-center gap-2">
          <GitCommit className="w-4 h-4" />
          How Version Tracking Works
        </h3>
        <div className="text-sm text-green-800 space-y-2">
          <p className="font-medium">Automatic version history from Git:</p>
          <div className="bg-white/50 p-3 rounded-md space-y-1">
            <p>✅ Commits are automatically tracked from your Git repository</p>
            <p>✅ Commits are categorized by type (feature, bugfix, etc.)</p>
            <p>✅ Version history is generated during the build process</p>
            <p>✅ Run <code className="bg-white px-1 rounded">npm run update-version</code> to refresh</p>
          </div>
          <div className="bg-white/50 p-3 rounded-md mt-3">
            <p className="font-medium mb-2">Commit message conventions:</p>
            <div className="space-y-1 text-xs">
              <p><span className="font-mono bg-blue-100 text-blue-800 px-1 rounded">feat:</span> or <span className="font-mono">add</span> → Feature</p>
              <p><span className="font-mono bg-red-100 text-red-800 px-1 rounded">fix:</span> or <span className="font-mono">bug</span> → Bugfix</p>
              <p><span className="font-mono bg-green-100 text-green-800 px-1 rounded">security</span> → Security</p>
              <p><span className="font-mono bg-orange-100 text-orange-800 px-1 rounded">perf:</span> → Performance</p>
              <p><span className="font-mono bg-gray-100 text-gray-800 px-1 rounded">docs:</span> → Documentation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
