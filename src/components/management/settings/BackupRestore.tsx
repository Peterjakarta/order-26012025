import React, { useState, useEffect } from 'react';
import { Download, Upload, Database, AlertCircle, Check, Cloud, Trash2, RefreshCw } from 'lucide-react';
import {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  getLastBackupDate,
  type BackupFile,
} from '../../../utils/backupService';
import { supabase } from '../../../lib/supabase';

export default function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cloudBackups, setCloudBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const lastBackupDate = getLastBackupDate();

  useEffect(() => {
    loadCloudBackups();
  }, []);

  const loadCloudBackups = async () => {
    try {
      setLoadingBackups(true);
      const backups = await listBackups();
      setCloudBackups(backups);
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCloudBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const filename = await createBackup();
      setSuccess(`Cloud backup created: ${filename}`);

      await loadCloudBackups();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Backup error:', err);
      setError(err?.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      setLoading(true);
      setError(null);

      const backup = await downloadBackup(filename);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Backup downloaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err?.message || 'Failed to download backup');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete backup: ${filename}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await deleteBackup(filename);
      setSuccess('Backup deleted successfully');

      await loadCloudBackups();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err?.message || 'Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromFile = async (backupData: any) => {
    try {
      setLoading(true);
      setError(null);

      if (!backupData.data) {
        throw new Error('Invalid backup format');
      }

      let restored = 0;

      // Restore each table
      for (const [tableName, records] of Object.entries(backupData.data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        // Delete existing data
        await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new data in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const { error } = await supabase.from(tableName).insert(batch);

          if (error) {
            console.error(`Error restoring ${tableName}:`, error);
          } else {
            restored += batch.length;
          }
        }
      }

      setSuccess(`Restored ${restored} records successfully!`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      console.error('Restore error:', err);
      setError(err?.message || 'Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromCloud = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore from: ${filename}?\n\nThis will replace all current data!`)) {
      return;
    }

    try {
      setLoading(true);
      const backup = await downloadBackup(filename);
      await handleRestoreFromFile(backup);
    } catch (err: any) {
      console.error('Restore error:', err);
      setError(err?.message || 'Failed to restore backup');
      setLoading(false);
    }
  };

  const handleLocalFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const backup = JSON.parse(content);
          await handleRestoreFromFile(backup);
        } catch (err: any) {
          setError('Invalid backup file');
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError('Failed to read backup file');
    }

    event.target.value = '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Cloud className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Database Backup & Restore</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automatic daily backups of your database to cloud storage
          </p>
          {lastBackupDate && (
            <p className="text-xs text-gray-500 mt-1">
              Last backup: {formatDate(lastBackupDate.toISOString())}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Database Data Only</h4>
            <p className="text-sm text-blue-800 mb-2">
              This backs up your database records (products, orders, categories, etc.) but NOT your application code.
            </p>
            <p className="text-sm text-blue-800">
              To backup your code, use the <strong>GitHub Backup</strong> tab.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-600 p-4 rounded-lg">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Create Cloud Backup
          </h3>
          <p className="text-sm text-gray-600">
            Upload a new backup to cloud storage
          </p>
          <button
            onClick={handleCloudBackup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Cloud className="w-4 h-4" />
            {loading ? 'Creating...' : 'Backup to Cloud'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Restore from File
          </h3>
          <p className="text-sm text-gray-600">
            Restore from a local backup file
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleLocalFileRestore}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Restoring...' : 'Choose File'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <Database className="w-4 h-4" />
            Cloud Backups ({cloudBackups.length})
          </h3>
          <button
            onClick={loadCloudBackups}
            disabled={loadingBackups}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingBackups ? (
          <div className="text-center py-8 text-gray-500">Loading backups...</div>
        ) : cloudBackups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No cloud backups found
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cloudBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {backup.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(backup.created_at)} • {formatSize(backup.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownloadBackup(backup.name)}
                    disabled={loading}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRestoreFromCloud(backup.name)}
                    disabled={loading}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                    title="Restore"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.name)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Backups are automatically created daily and kept for 30 days. Stored securely in Supabase Storage.
        </div>
      </div>
    </div>
  );
}