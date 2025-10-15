import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import BatchNumbers from '../components/haccp/BatchNumbers';

export default function HACCP() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HACCP Management</h1>
              <p className="text-sm text-gray-600">Hazard Analysis and Critical Control Points</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="batch-numbers" replace />} />
          <Route path="batch-numbers" element={<BatchNumbers />} />
        </Routes>
      </div>
    </div>
  );
}
