import React, { useState } from 'react';
import { Download, Upload, Database, AlertCircle, Check } from 'lucide-react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../lib/firebase';

export default function BackupRestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Collect data from all collections
      const backup: Record<string, any[]> = {};
      
      for (const collectionName of Object.values(COLLECTIONS)) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        backup[collectionName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // Convert to JSON and create blob
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cokelateh-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Backup created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Backup error:', err);
      setError('Failed to create backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);
      setSuccess(null);

      // Read file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const backup = JSON.parse(content);

          // Validate backup structure
          const requiredCollections = Object.values(COLLECTIONS);
          const missingCollections = requiredCollections.filter(
            collection => !backup[collection]
          );

          if (missingCollections.length > 0) {
            throw new Error(`Invalid backup file. Missing collections: ${missingCollections.join(', ')}`);
          }

          // Start batch operations for restore
          const batch = writeBatch(db);
          let operationCount = 0;
          const MAX_BATCH_SIZE = 500;
          const batches: any[] = [];

          // Process each collection
          for (const [collectionName, documents] of Object.entries(backup)) {
            if (!Array.isArray(documents)) continue;

            for (const document of documents) {
              const { id, ...data } = document;
              const docRef = doc(db, collectionName, id);

              // Remove any undefined values
              Object.keys(data).forEach(key => {
                if (data[key] === undefined) delete data[key];
              });

              batch.set(docRef, data);
              operationCount++;

              // If batch is full, add it to batches array and create new batch
              if (operationCount >= MAX_BATCH_SIZE) {
                batches.push(batch);
                operationCount = 0;
              }
            }
          }

          // Add final batch if it has operations
          if (operationCount > 0) {
            batches.push(batch);
          }

          // Execute all batches
          await Promise.all(batches.map(batch => batch.commit()));

          setSuccess('Backup restored successfully');
          setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
          console.error('Restore error:', err);
          setError(err instanceof Error ? err.message : 'Failed to restore backup');
        } finally {
          setLoading(false);
        }
      };

      reader.readAsText(file);
    } catch (err) {
      console.error('Restore error:', err);
      setError('Failed to restore backup. Please check the file and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Database className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Backup & Restore</h2>
          <p className="text-sm text-gray-600 mt-1">
            Export your data for backup or restore from a previous backup
          </p>
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

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h3 className="font-medium">Create Backup</h3>
          <p className="text-sm text-gray-600">
            Download a backup file containing all your data
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Creating Backup...' : 'Download Backup'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg border space-y-3">
          <h3 className="font-medium">Restore Backup</h3>
          <p className="text-sm text-gray-600">
            Restore your data from a previous backup file
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Restoring...' : 'Select Backup File'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Warning: Restoring a backup will overwrite all existing data
          </p>
        </div>
      </div>
    </div>
  );
}