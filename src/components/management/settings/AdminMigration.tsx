import React, { useState } from 'react';
import { Database, AlertCircle, Check, Loader2 } from 'lucide-react';
import { migrateData, validateMigration } from '../../../utils/adminMigration';

export default function AdminMigration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  const handleMigrate = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await migrateData();
      
      // Validate migration
      const results = await validateMigration();
      setValidationResults(results);
      
      const allMatch = results.every(r => r.match);
      if (allMatch) {
        setSuccess('Migration completed successfully!');
      } else {
        setError('Migration completed but validation found mismatches. Please check the results.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      console.error('Migration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Database className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Admin Migration</h2>
          <p className="text-sm text-gray-600 mt-1">
            Migrate data directly between Firebase projects
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

      <div className="bg-white p-6 rounded-lg border space-y-4">
        <h3 className="font-medium">Migration Status</h3>
        
        {validationResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Validation Results:</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2">Collection</th>
                    <th className="text-right py-2">Source</th>
                    <th className="text-right py-2">Target</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResults.map((result) => (
                    <tr key={result.collection}>
                      <td className="py-2">{result.collection}</td>
                      <td className="text-right">{result.sourceCount}</td>
                      <td className="text-right">{result.targetCount}</td>
                      <td className="text-center">
                        {result.match ? (
                          <Check className="w-4 h-4 text-green-500 inline" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleMigrate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {loading ? 'Migrating...' : 'Start Migration'}
        </button>
      </div>
    </div>
  );
}