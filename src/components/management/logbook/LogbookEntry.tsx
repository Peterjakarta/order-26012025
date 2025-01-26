import React from 'react';
import { Clock, User, Tag } from 'lucide-react';
import type { LogEntry } from '../../../types/types';

interface LogbookEntryProps {
  entry: LogEntry;
}

export default function LogbookEntry({ entry }: LogbookEntryProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'bg-blue-100 text-blue-800';
      case 'feature':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {new Date(entry.timestamp).toLocaleString()}
          </div>
          
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{entry.username}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
              {entry.category}
            </span>
            <span className="text-gray-900">{entry.action}</span>
          </div>

          {entry.details && (
            <p className="text-sm text-gray-600 mt-2">{entry.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}