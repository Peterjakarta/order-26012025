import { useState, useCallback, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, startAfter, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { LogEntry } from '../types/types';

const ENTRIES_PER_PAGE = 50;

export function useLogbook() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastEntry, setLastEntry] = useState<any>(null);

  // Subscribe to latest log entries
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, COLLECTIONS.LOGS),
      orderBy('timestamp', 'desc'),
      limit(ENTRIES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const logEntries: LogEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logEntries.push({
            id: doc.id,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
            userId: data.userId,
            username: data.username,
            action: data.action,
            details: data.details,
            category: data.category
          });
        });
        setEntries(logEntries);
        setLastEntry(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === ENTRIES_PER_PAGE);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching logs:', err);
        setError('Failed to load log entries');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastEntry || !hasMore) return;

    try {
      const q = query(
        collection(db, COLLECTIONS.LOGS),
        orderBy('timestamp', 'desc'),
        startAfter(lastEntry),
        limit(ENTRIES_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      const newEntries: LogEntry[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        newEntries.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          userId: data.userId,
          username: data.username,
          action: data.action,
          details: data.details,
          category: data.category
        });
      });

      setEntries(prev => [...prev, ...newEntries]);
      setLastEntry(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === ENTRIES_PER_PAGE);
    } catch (err) {
      console.error('Error loading more logs:', err);
      setError('Failed to load more entries');
    }
  }, [lastEntry, hasMore]);

  const filterEntries = useCallback(async (
    category?: 'products' | 'orders' | 'recipes' | 'ingredients' | 'categories' | 'users' | 'auth' | 'stock' | 'system',
    username?: string,
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      let q = query(
        collection(db, COLLECTIONS.LOGS),
        orderBy('timestamp', 'desc')
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }

      if (username) {
        q = query(q, where('username', '==', username));
      }

      if (startDate) {
        q = query(q, where('timestamp', '>=', new Date(startDate)));
      }

      if (endDate) {
        q = query(q, where('timestamp', '<=', new Date(endDate)));
      }

      const snapshot = await getDocs(q);
      const filteredEntries: LogEntry[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        filteredEntries.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          userId: data.userId,
          username: data.username,
          action: data.action,
          details: data.details,
          category: data.category
        });
      });

      setEntries(filteredEntries);
      setHasMore(false); // Disable pagination for filtered results
      setLoading(false);
    } catch (err) {
      console.error('Error filtering logs:', err);
      setError('Failed to filter entries');
      setLoading(false);
    }
  }, []);

  return {
    entries,
    loading,
    error,
    hasMore,
    loadMore,
    filterEntries
  };
}