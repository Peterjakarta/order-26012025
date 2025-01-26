import { useState, useCallback, useEffect } from 'react';
import { branches } from '../data/branches';
import type { Branch } from '../types/types';

export function useBranches() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Return static branch data for now
  return {
    branches,
    loading,
    error,
    addBranch: useCallback(async () => {}, []),
    updateBranch: useCallback(async () => {}, []),
    deleteBranch: useCallback(async () => {}, [])
  };
}