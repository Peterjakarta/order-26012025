import React, { useState, useEffect } from 'react';
import {
  Info,
  GitBranch,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Package2,
  Bug,
  Zap,
  Shield,
  Gauge,
  FileText,
  Clock,
  Loader,
  AlertCircle,
  X,
  CheckCircle
} from 'lucide-react';
import packageJson from '../../../../package.json';
import { useAuth } from '../../../hooks/useAuth';
import {
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
  writeBatch,
  doc,
  where,
  orderBy as firestoreOrderBy
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';

interface VersionCommit {
  id: string;
  versionId: string;
  title: string;
  description?: string;
  author: string;
  commitDate: Date;
  category: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  createdAt: Date;
}

interface Version {
  id: string;
  version: string;
  releaseDate: Date;
  isCurrent: boolean;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  commits?: VersionCommit[];
}

export default function VersionInfo() {
  const { user, hasPermission } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [showAddCommit, setShowAddCommit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const initializeVersions = async () => {
    try {
      console.log('Initializing version 1.0.0...');

      // Create initial version
      const versionRef = await addDoc(collection(db, COLLECTIONS.VERSIONS), {
        version: '1.0.0',
        releaseDate: serverTimestamp(),
        isCurrent: true,
        notes: 'Initial release with comprehensive order management, product catalog, recipe tracking, and stock management features',
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'System'
      });

      const now = new Date();
      const commits = [
        {
          title: 'Order Management System',
          description: 'Complete order management with create, update, and completion workflows',
          category: 'feature',
          days: 30
        },
        {
          title: 'Product & Category Management',
          description: 'Full product catalog with categories, pricing, and inventory tracking',
          category: 'feature',
          days: 25
        },
        {
          title: 'Recipe Management',
          description: 'Recipe creation and management with ingredient tracking and cost calculations',
          category: 'feature',
          days: 20
        },
        {
          title: 'Stock Management',
          description: 'Ingredient stock tracking with history, alerts, and automated deductions',
          category: 'feature',
          days: 15
        },
        {
          title: 'Production Planning',
          description: 'Production scheduling and planning features with calendar view',
          category: 'feature',
          days: 10
        },
        {
          title: 'Enhanced Logbook',
          description: 'Comprehensive activity logging across all system operations',
          category: 'feature',
          days: 5
        },
        {
          title: 'User Authentication & Permissions',
          description: 'Secure authentication with role-based access control',
          category: 'security',
          days: 3
        },
        {
          title: 'Reporting & Export Features',
          description: 'Generate detailed reports with PDF and Excel export capabilities',
          category: 'feature',
          days: 2
        },
        {
          title: 'Performance Improvements',
          description: 'Optimized database queries and improved UI responsiveness',
          category: 'performance',
          days: 1
        },
        {
          title: 'R&D Product Management',
          description: 'Research and development product tracking with approval workflows',
          category: 'feature',
          days: 1
        }
      ];

      for (const commit of commits) {
        const commitDate = new Date(now.getTime() - commit.days * 24 * 60 * 60 * 1000);
        await addDoc(collection(db, COLLECTIONS.VERSION_COMMITS), {
          versionId: versionRef.id,
          title: commit.title,
          description: commit.description,
          author: user?.email || 'System',
          commitDate: commitDate,
          category: commit.category,
          createdAt: serverTimestamp()
        });
      }

      console.log('Version 1.0.0 initialized successfully');
      await fetchVersions();
    } catch (err) {
      console.error('Error initializing versions:', err);
      setError('Failed to initialize version information');
    }
  };

  const fetchVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching versions from Firebase...');

      // Fetch all versions
      const versionsSnapshot = await getDocs(collection(db, COLLECTIONS.VERSIONS));

      console.log('Versions snapshot received:', versionsSnapshot.size, 'documents');

      // If no versions exist, initialize
      if (versionsSnapshot.empty) {
        console.log('No versions found, initializing...');
        await initializeVersions();
        return;
      }

      const versionsData: Version[] = [];

      for (const versionDoc of versionsSnapshot.docs) {
        const data = versionDoc.data();

        // Fetch commits for this version
        const commitsQuery = query(
          collection(db, COLLECTIONS.VERSION_COMMITS),
          where('versionId', '==', versionDoc.id)
        );
        const commitsSnapshot = await getDocs(commitsQuery);

        const commits: VersionCommit[] = commitsSnapshot.docs.map(commitDoc => {
          const commitData = commitDoc.data();
          return {
            id: commitDoc.id,
            versionId: versionDoc.id,
            title: commitData.title,
            description: commitData.description,
            author: commitData.author,
            commitDate: commitData.commitDate?.toDate?.() || new Date(),
            category: commitData.category || 'feature',
            createdAt: commitData.createdAt?.toDate?.() || new Date()
          };
        });

        // Sort commits by date
        commits.sort((a, b) => b.commitDate.getTime() - a.commitDate.getTime());

        const version: Version = {
          id: versionDoc.id,
          version: data.version,
          releaseDate: data.releaseDate?.toDate?.() || new Date(),
          isCurrent: data.isCurrent || false,
          notes: data.notes,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          createdBy: data.createdBy || 'Unknown',
          commits
        };

        versionsData.push(version);

        if (version.isCurrent) {
          setCurrentVersion(version);
        }
      }

      // Sort versions by release date
      versionsData.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());

      console.log('Successfully loaded', versionsData.length, 'versions');
      setVersions(versionsData);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching versions:', err);
      const errorMessage = err?.message || 'Unknown error occurred';
      const errorDetails = `${errorMessage}${err?.code ? ` (${err.code})` : ''}`;
      setError(`Failed to load version information: ${errorDetails}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleAddVersion = async () => {
    if (!newVersion.version) return;

    try {
      setSaving(true);
      const batch = writeBatch(db);

      // Unset current version flags
      const currentVersionsSnapshot = await getDocs(
        query(collection(db, COLLECTIONS.VERSIONS), where('isCurrent', '==', true))
      );
      currentVersionsSnapshot.docs.forEach(docSnap => {
        batch.update(doc(db, COLLECTIONS.VERSIONS, docSnap.id), { isCurrent: false });
      });

      // Add new version
      const versionRef = doc(collection(db, COLLECTIONS.VERSIONS));
      batch.set(versionRef, {
        version: newVersion.version,
        releaseDate: serverTimestamp(),
        isCurrent: true,
        notes: newVersion.notes || '',
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'Unknown'
      });

      await batch.commit();
      setNewVersion({ version: '', notes: '' });
      setShowAddVersion(false);
      await fetchVersions();
      setSaving(false);
    } catch (err) {
      console.error('Error adding version:', err);
      alert('Failed to add version. Please try again.');
      setSaving(false);
    }
  };

  const handleAddCommit = async (versionId: string) => {
    if (!newCommit.title) return;

    try {
      setSaving(true);
      await addDoc(collection(db, COLLECTIONS.VERSION_COMMITS), {
        versionId,
        title: newCommit.title,
        description: newCommit.description || '',
        author: user?.email || 'Unknown',
        commitDate: new Date(),
        category: newCommit.category,
        createdAt: serverTimestamp()
      });

      setNewCommit({ title: '', description: '', category: 'feature' });
      setShowAddCommit(null);
      await fetchVersions();
      setSaving(false);
    } catch (err) {
      console.error('Error adding commit:', err);
      alert('Failed to add commit. Please try again.');
      setSaving(false);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader className="w-8 h-8 text-pink-600 animate-spin" />
        <p className="text-gray-600">Loading version information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
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
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Version
          </button>
        )}
      </div>

      {/* Add Version Form */}
      {showAddVersion && (
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Add New Version</h3>
            <button
              onClick={() => setShowAddVersion(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version Number
              </label>
              <input
                type="text"
                value={newVersion.version}
                onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                placeholder="e.g., 1.1.0"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Release Notes
              </label>
              <textarea
                value={newVersion.notes}
                onChange={(e) => setNewVersion({ ...newVersion, notes: e.target.value })}
                placeholder="Brief description of this release..."
                rows={3}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddVersion(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleAddVersion}
              disabled={!newVersion.version || saving}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Add Version
                </>
              )}
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
                  Released {formatDate(currentVersion.releaseDate)}
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
              <h4 className="font-medium text-pink-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Changes in this version ({currentVersion.commits.length}):
              </h4>
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
                      <span>{formatDateTime(commit.commitDate)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {canManageVersions && (
                <button
                  onClick={() => setShowAddCommit(currentVersion.id)}
                  className="text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1 mt-2 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add change to this version
                </button>
              )}
            </div>
          )}

          {/* Add Commit Form */}
          {showAddCommit === currentVersion.id && (
            <div className="bg-white p-4 rounded-md border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Add Change</h4>
                <button
                  onClick={() => setShowAddCommit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCommit.category}
                    onChange={(e) => setNewCommit({ ...newCommit, category: e.target.value as VersionCommit['category'] })}
                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddCommit(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddCommit(currentVersion.id)}
                  disabled={!newCommit.title || saving}
                  className="px-3 py-1 text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Change'
                  )}
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
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
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
                            {formatDate(version.releaseDate)}
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
                                  <span>{formatDateTime(commit.commitDate)}</span>
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

      {/* Feature Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium mb-3 text-blue-900 flex items-center gap-2">
          <Package2 className="w-4 h-4" />
          Key Features
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Order Management
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Product Catalog
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Recipe Management
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Stock Tracking
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Production Planning
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Activity Logging
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            User Management
          </div>
          <div className="flex items-center gap-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            R&D Products
          </div>
        </div>
      </div>
    </div>
  );
}
