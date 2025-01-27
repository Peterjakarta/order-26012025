import React, { useState } from 'react';
import { ClipboardList, Loader, FileDown, FileSpreadsheet, Trash2, AlertCircle } from 'lucide-react';
import { useLogbook } from '../../../hooks/useLogbook';
import LogbookEntry from './LogbookEntry';
import LogbookFilter from './LogbookFilter';
import { generateExcelData, saveWorkbook } from '../../../utils/excelGenerator';
import { generateLogbookPDF } from '../../../utils/pdfGenerator';
import ConfirmDialog from '../../common/ConfirmDialog';

export default function Logbook() {
  const { entries, loading, error, hasMore, loadMore, filterEntries, clearEntries } = useLogbook();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop === clientHeight && hasMore && !loading) {
      loadMore();
    }
  };

  const handleDownloadExcel = () => {
    try {
      const data = [
        ['System Logbook'],
        ['Generated on:', new Date().toLocaleString()],
        [''],
        ['Timestamp', 'User', 'Category', 'Action', 'Details']
      ];

      entries.forEach(entry => {
        data.push([
          new Date(entry.timestamp).toLocaleString(),
          entry.username,
          entry.category,
          entry.action,
          entry.details || ''
        ]);
      });

      const wb = generateExcelData(data, 'System Logbook');
      saveWorkbook(wb, 'logbook.xlsx');
    } catch (err) {
      console.error('Error generating Excel:', err);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = generateLogbookPDF(entries);
      doc.save('logbook.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleClearLogs = async () => {
    try {
      await clearEntries();
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />
          <h2 className="text-xl font-semibold">System Logbook</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
            title="Download PDF"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      <LogbookFilter
        onFilter={({ category, username, startDate, endDate }) => {
          filterEntries(category, username, startDate, endDate);
        }}
      />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div 
        className="space-y-2 max-h-[600px] overflow-y-auto p-1"
        onScroll={handleScroll}
      >
        {entries.map(entry => (
          <LogbookEntry key={entry.id} entry={entry} />
        ))}

        {loading && (
          <div className="flex justify-center p-4">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No log entries found</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Logbook"
        message="Are you sure you want to clear all log entries? This action cannot be undone."
        onConfirm={handleClearLogs}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}