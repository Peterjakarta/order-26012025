import React, { useState } from 'react';
import {
  Info,
  GitBranch,
  Calendar,
  ChevronDown,
  ChevronRight,
  Package2,
  Bug,
  Zap,
  Shield,
  Gauge,
  FileText,
  Clock
} from 'lucide-react';
import packageJson from '../../../../package.json';
import { versions } from '../../../data/versions';
import type { VersionCommit } from '../../../data/versions';

export default function VersionInfo() {
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const currentVersion = versions.find(v => v.isCurrent);
  const previousVersions = versions.filter(v => !v.isCurrent);

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const getCategoryIcon = (category: VersionCommit['category']) => {
    const iconClass = "w-3.5 h-3.5";
    switch (category) {
      case 'feature': return <Package2 className={iconClass} />;
      case 'bugfix': return <Bug className={iconClass} />;
      case 'enhancement': return <Zap className={iconClass} />;
      case 'security': return <Shield className={iconClass} />;
      case 'performance': return <Gauge className={iconClass} />;
      case 'documentation': return <FileText className={iconClass} />;
      default: return <Package2 className={iconClass} />;
    }
  };

  const getCategoryColor = (category: VersionCommit['category']) => {
    switch (category) {
      case 'feature': return 'bg-green-100 text-green-800 border-green-200';
      case 'bugfix': return 'bg-red-100 text-red-800 border-red-200';
      case 'enhancement': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'security': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'performance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'documentation': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Info className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Version Information</h2>
            <p className="text-sm text-gray-600">Release history and change log</p>
          </div>
        </div>
      </div>

      {currentVersion && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-lg border-2 border-pink-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-pink-600" />
              <div>
                <h3 className="text-lg font-bold text-pink-900">Current Version</h3>
                <p className="text-sm text-pink-700">Released {formatDate(currentVersion.releaseDate)}</p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-pink-600 text-white">
              v{currentVersion.version}
            </span>
          </div>

          {currentVersion.notes && (
            <p className="text-sm text-pink-800 bg-white/50 p-3 rounded-md">{currentVersion.notes}</p>
          )}

          {currentVersion.commits && currentVersion.commits.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-pink-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Changes in this version ({currentVersion.commits.length}):
              </h4>
              <div className="space-y-2">
                {currentVersion.commits.map((commit, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-md border border-pink-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getCategoryColor(commit.category)}`}>
                        {getCategoryIcon(commit.category)}
                        {commit.category}
                      </span>
                      <p className="text-sm font-medium text-gray-900 flex-grow">{commit.title}</p>
                    </div>
                    {commit.description && (
                      <p className="text-sm text-gray-600 pl-2 border-l-2 border-gray-300">{commit.description}</p>
                    )}
                    <div className="flex justify-end text-xs text-gray-500">
                      <span>{formatDateTime(commit.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {previousVersions.length > 0 && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <button
            onClick={() => setShowAllVersions(!showAllVersions)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium">Previous Versions ({previousVersions.length})</h3>
            </div>
            {showAllVersions ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAllVersions && (
            <div className="space-y-3 mt-4">
              {previousVersions.map((version) => (
                <div key={version.version} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleVersion(version.version)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedVersions.has(version.version) ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div className="text-left">
                        <div className="font-medium">v{version.version}</div>
                        <div className="text-sm text-gray-500">{formatDate(version.releaseDate)}</div>
                      </div>
                    </div>
                    {version.commits && version.commits.length > 0 && (
                      <span className="text-sm text-gray-500">{version.commits.length} changes</span>
                    )}
                  </button>

                  {expandedVersions.has(version.version) && (
                    <div className="p-4 bg-gray-50 border-t space-y-3">
                      {version.notes && (
                        <p className="text-sm text-gray-700 bg-white p-3 rounded-md">{version.notes}</p>
                      )}

                      {version.commits && version.commits.length > 0 && (
                        <div className="space-y-2">
                          {version.commits.map((commit, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-md border space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getCategoryColor(commit.category)}`}>
                                  {getCategoryIcon(commit.category)}
                                  {commit.category}
                                </span>
                                <p className="font-medium text-gray-900 flex-grow">{commit.title}</p>
                              </div>
                              {commit.description && (
                                <p className="text-gray-600 pl-2 border-l-2 border-gray-300">{commit.description}</p>
                              )}
                              <div className="flex justify-end text-xs text-gray-500">
                                <span>{formatDateTime(commit.date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
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
          <GitBranch className="w-4 h-4" />
          Automatic Version Tracking
        </h3>
        <div className="text-sm text-green-800 space-y-2">
          <p className="font-medium">This version information updates automatically from your git commits!</p>
          <div className="bg-white/50 p-3 rounded-md space-y-1">
            <p>✅ Write good commit messages</p>
            <p>✅ Push to GitHub (main/master branch)</p>
            <p>✅ GitHub Actions reads your git history</p>
            <p>✅ Version info updates automatically</p>
          </div>
          <p className="text-xs">
            See <code className="bg-green-100 px-1 rounded">VERSIONING.md</code> for commit message best practices
          </p>
        </div>
      </div>
    </div>
  );
}
