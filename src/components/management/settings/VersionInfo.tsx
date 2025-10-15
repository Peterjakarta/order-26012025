import React, { useState } from 'react';
import {
  Info,
  GitBranch,
  Calendar,
  GitCommit,
  ChevronDown,
  ChevronRight,
  Plus,
  Package2,
  Bug,
  Zap,
  Shield,
  Gauge,
  FileText,
  Loader,
  AlertCircle
} from 'lucide-react';
import packageJson from '../../../../package.json';
import { useVersions, type VersionCommit } from '../../../hooks/useVersions';
import { useAuth } from '../../../hooks/useAuth';

export default function VersionInfo() {
  const { currentVersion, versions, loading, error, addVersion, addCommit } = useVersions();
  const { hasPermission } = useAuth();
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [showAddCommit, setShowAddCommit] = useState<string | null>(null);

  const [newVersion, setNewVersion] = useState({ version: '', notes: '' });
  const [newCommit, setNewCommit] = useState({
    title: '',
    description: '',
    category: 'feature' as VersionCommit['category']
  });

  const canManageVersions = hasPermission('manage_users');

  const toggleVersion = (versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const handleAddVersion = async () => {
    try {
      await addVersion({
        version: newVersion.version,
        notes: newVersion.notes,
        isCurrent: true
      });
      setNewVersion({ version: '', notes: '' });
      setShowAddVersion(false);
    } catch (err) {
      console.error('Failed to add version:', err);
      alert('Failed to add version. Please try again.');
    }
  };

  const handleAddCommit = async (versionId: string) => {
    try {
      await addCommit(versionId, newCommit);
      setNewCommit({ title: '', description: '', category: 'feature' });
      setShowAddCommit(null);
    } catch (err) {
      console.error('Failed to add commit:', err);
      alert('Failed to add commit. Please try again.');
    }
  };

  const getCategoryIcon = (category: VersionCommit['category']) => {
    const iconClass = "w-3.5 h-3.5";
    switch (category) {
      case 'feature':
        return <Package2 className={iconClass} />;
      case 'bugfix':
        return <Bug className={iconClass} />;
      case 'enhancement':
        return <Zap className={iconClass} />;
      case 'security':
        return <Shield className={iconClass} />;
      case 'performance':
        return <Gauge className={iconClass} />;
      case 'documentation':
        return <FileText className={iconClass} />;
      default:
        return <Package2 className={iconClass} />;
    }
  };

  const getCategoryColor = (category: VersionCommit['category']) => {
    switch (category) {
      case 'feature':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'bugfix':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'enhancement':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'security':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'performance':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'documentation':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Info className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Version Information</h2>
            <p className="text-sm text-gray-600">
              Release history and change log
            </p>
          </div>
        </div>
        {canManageVersions && (
          <button
            onClick={() => setShowAddVersion(!showAddVersion)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            New Version
          </button>
        )}
      </div>

      {/* Add Version Form */}
      {showAddVersion && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h3 className="font-medium">Add New Version</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Number
              </label>
              <input
                type="text"
                value={newVersion.version}
                onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                placeholder="e.g., 1.1.0"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Release Notes
              </label>
              <textarea
                value={newVersion.notes}
                onChange={(e) => setNewVersion({ ...newVersion, notes: e.target.value })}
                placeholder="Brief description of this release..."
                rows={3}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddVersion(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAddVersion}
              disabled={!newVersion.version}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
            >
              Add Version
            </button>
          </div>
        </div>
      )}

      {/* Current Version */}
      {currentVersion && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-lg border-2 border-pink-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-pink-600" />
              <div>
                <h3 className="text-lg font-bold text-pink-900">Current Version</h3>
                <p className="text-sm text-pink-700">
                  Released {new Date(currentVersion.releaseDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className="px-4 py-2 rounded-full text-lg font-bold bg-pink-600 text-white">
              v{currentVersion.version}
            </span>
          </div>

          {currentVersion.notes && (
            <p className="text-sm text-pink-800 bg-white/50 p-3 rounded-md">
              {currentVersion.notes}
            </p>
          )}

          {/* Current Version Commits */}
          {currentVersion.commits && currentVersion.commits.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-pink-900 text-sm">Changes in this version:</h4>
              <div className="space-y-2">
                {currentVersion.commits.map(commit => (
                  <div
                    key={commit.id}
                    className="bg-white p-3 rounded-md border border-pink-200 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getCategoryColor(commit.category)}`}>
                        {getCategoryIcon(commit.category)}
                        {commit.category}
                      </span>
                      <p className="text-sm font-medium text-gray-900 flex-grow">
                        {commit.title}
                      </p>
                    </div>
                    {commit.description && (
                      <p className="text-sm text-gray-600 pl-2 border-l-2 border-gray-300">
                        {commit.description}
                      </p>
                    )}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{commit.author}</span>
                      <span>{new Date(commit.commitDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {canManageVersions && (
                <button
                  onClick={() => setShowAddCommit(currentVersion.id)}
                  className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3 h-3" />
                  Add change to this version
                </button>
              )}
            </div>
          )}

          {/* Add Commit Form */}
          {showAddCommit === currentVersion.id && (
            <div className="bg-white p-4 rounded-md border space-y-3">
              <h4 className="font-medium text-sm">Add Change</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCommit.category}
                    onChange={(e) => setNewCommit({ ...newCommit, category: e.target.value as VersionCommit['category'] })}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="feature">Feature</option>
                    <option value="bugfix">Bug Fix</option>
                    <option value="enhancement">Enhancement</option>
                    <option value="security">Security</option>
                    <option value="performance">Performance</option>
                    <option value="documentation">Documentation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newCommit.title}
                    onChange={(e) => setNewCommit({ ...newCommit, title: e.target.value })}
                    placeholder="Brief description..."
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newCommit.description}
                    onChange={(e) => setNewCommit({ ...newCommit, description: e.target.value })}
                    placeholder="Detailed description..."
                    rows={2}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCommit(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCommit(currentVersion.id)}
                  disabled={!newCommit.title}
                  className="px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50"
                >
                  Add Change
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Versions */}
      {versions.length > 1 && (
        <div className="bg-white p-4 rounded-lg border space-y-4">
          <button
            onClick={() => setShowAllVersions(!showAllVersions)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium">Previous Versions ({versions.length - 1})</h3>
            </div>
            {showAllVersions ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAllVersions && (
            <div className="space-y-3 mt-4">
              {versions
                .filter(v => !v.isCurrent)
                .map(version => (
                  <div
                    key={version.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleVersion(version.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {expandedVersions.has(version.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">v{version.version}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(version.releaseDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {version.commits && version.commits.length > 0 && (
                        <span className="text-sm text-gray-500">
                          {version.commits.length} changes
                        </span>
                      )}
                    </button>

                    {expandedVersions.has(version.id) && (
                      <div className="p-4 bg-gray-50 border-t space-y-3">
                        {version.notes && (
                          <p className="text-sm text-gray-700 bg-white p-3 rounded-md">
                            {version.notes}
                          </p>
                        )}

                        {version.commits && version.commits.length > 0 ? (
                          <div className="space-y-2">
                            {version.commits.map(commit => (
                              <div
                                key={commit.id}
                                className="bg-white p-3 rounded-md border space-y-2 text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${getCategoryColor(commit.category)}`}>
                                    {getCategoryIcon(commit.category)}
                                    {commit.category}
                                  </span>
                                  <p className="font-medium text-gray-900 flex-grow">
                                    {commit.title}
                                  </p>
                                </div>
                                {commit.description && (
                                  <p className="text-gray-600 pl-2 border-l-2 border-gray-300">
                                    {commit.description}
                                  </p>
                                )}
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>{commit.author}</span>
                                  <span>{new Date(commit.commitDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No changes recorded for this version</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* System Information */}
      <div className="bg-gray-50 p-4 rounded-lg border space-y-2 text-sm text-gray-600">
        <p><span className="font-medium">Package Version:</span> {packageJson.version}</p>
        <p><span className="font-medium">Environment:</span> {import.meta.env.MODE}</p>
        <p><span className="font-medium">Node Engine:</span> {packageJson.engines.node}</p>
      </div>
    </div>
  );
}
