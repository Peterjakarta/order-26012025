import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, Check, Loader2 } from 'lucide-react';
import { importFromJSON, validateBackupData, exportCurrentData } from '../../../utils/dataMigration';

export default function DataMigration() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setValidationErrors([]);

      // Read and parse the JSON file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const backupData = JSON.parse(content);

          // Validate the backup data
          const errors = await validateBackupData(backupData);
          if (errors.length > 0) {
            setValidationErrors(errors);
            return;
          }

          // Import the data
          await importFromJSON(backupData);
          setSuccess('Data imported successfully!');
          
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (err) {
          setError('Failed to import data. Please check the file format and try again.');
          console.error('Import error:', err);
        } finally {
          setLoading(false);
        }
      };

      reader.readAsText(file);
    } catch (err) {
      setError('Failed to read the backup file');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await exportCurrentData();
      
      // Create and download the JSON file
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cokelateh-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully!');
    } catch (err) {
      setError('Failed to export data');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Upload className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Data Migration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Import data from a backup file or export current data
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-600 p-4 rounded-lg">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
          <h3 className="font-medium text-yellow-800">Validation Errors</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h3 className="font-medium">Import Data</h3>
          <p className="text-sm text-gray-600">
            Import data from a backup JSON file. This will merge with existing data.
          </p>
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {loading ? 'Importing...' : 'Select Backup File'}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border space-y-4">
          <h3 className="font-medium">Export Data</h3>
          <p className="text-sm text-gray-600">
            Export current data to a JSON file for backup.
          </p>
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? 'Exporting...' : 'Export Current Data'}
          </button>
        </div>
      </div>
    </div>
  );
}