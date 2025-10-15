import React from 'react';
import {
  Clock,
  User,
  Package2,
  ShoppingCart,
  Beaker,
  Cookie,
  FolderTree,
  Users,
  LogIn,
  Warehouse,
  Settings
} from 'lucide-react';
import type { LogEntry } from '../../../types/types';

interface LogbookEntryProps {
  entry: LogEntry;
}

export default function LogbookEntry({ entry }: LogbookEntryProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'products':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'orders':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'recipes':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'ingredients':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'categories':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'users':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'stock':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconClass = "w-3.5 h-3.5";
    switch (category) {
      case 'auth':
        return <LogIn className={iconClass} />;
      case 'products':
        return <Package2 className={iconClass} />;
      case 'orders':
        return <ShoppingCart className={iconClass} />;
      case 'recipes':
        return <Beaker className={iconClass} />;
      case 'ingredients':
        return <Cookie className={iconClass} />;
      case 'categories':
        return <FolderTree className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'stock':
        return <Warehouse className={iconClass} />;
      case 'system':
        return <Settings className={iconClass} />;
      default:
        return <Settings className={iconClass} />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow space-y-2">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">{entry.username}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getCategoryColor(entry.category)}`}>
              {getCategoryIcon(entry.category)}
              {entry.category}
            </span>
            <span className="text-gray-900 font-medium">{entry.action}</span>
          </div>

          {entry.details && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 border-l-2 border-gray-300">
              {entry.details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}