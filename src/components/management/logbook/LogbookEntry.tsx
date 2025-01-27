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
    <div className="bg-white px-4 py-2 rounded border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 text-xs text-gray-500 w-32">
          {new Date(entry.timestamp).toLocaleString()}
        </div>
        
        <div className="flex-shrink-0 flex items-center gap-1 w-24">
          <User className="w-3 h-3 text-gray-400" />
          <span className="text-sm">{entry.username}</span>
        </div>
        
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
          {entry.category}
        </span>
        
        <div className="flex-grow">
          <span className="text-sm">{entry.action}</span>
          {entry.details && (
            <p className="text-xs text-gray-500 mt-0.5">{entry.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}