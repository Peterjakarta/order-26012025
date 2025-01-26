import React from 'react';
import { ClipboardList, Loader } from 'lucide-react';
import { useLogbook } from '../../../hooks/useLogbook';
import LogbookEntry from './LogbookEntry';
import LogbookFilter from './LogbookFilter';

export default function Logbook() {
  const { entries, loading, error, hasMore, loadMore, filterEntries } = useLogbook();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop === clientHeight && hasMore && !loading) {
      loadMore();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-6 h-6" />
        <h2 className="text-xl font-semibold">System Logbook</h2>
      </div>

      <LogbookFilter
        onFilter={({ category, username, startDate, endDate }) => {
          filterEntries(category, username, startDate, endDate);
        }}
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div 
        className="space-y-4 max-h-[600px] overflow-y-auto p-1"
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
    </div>
  );
}