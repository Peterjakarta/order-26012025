import React, { useState } from 'react';
import { Filter, Search } from 'lucide-react';

interface LogbookFilterProps {
  onFilter: (filters: {
    category?: 'auth' | 'feature' | 'system';
    username?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export default function LogbookFilter({ onFilter }: LogbookFilterProps) {
  const [category, setCategory] = useState<'auth' | 'feature' | 'system' | ''>('');
  const [username, setUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = () => {
    onFilter({
      category: category || undefined,
      username: username || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
  };

  const handleReset = () => {
    setCategory('');
    setUsername('');
    setStartDate('');
    setEndDate('');
    onFilter({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-gray-700 mb-2">
        <Filter className="w-5 h-5" />
        <h3 className="font-medium">Filter Logs</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="feature">Feature Usage</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Filter by username"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
        >
          Reset
        </button>
        <button
          onClick={handleFilter}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Search className="w-4 h-4" />
          Apply Filters
        </button>
      </div>
    </div>
  );
}