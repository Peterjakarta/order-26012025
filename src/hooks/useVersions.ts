import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, where, addDoc, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, COLLECTIONS, auth } from '../lib/firebase';

export interface VersionCommit {
  id: string;
  versionId: string;
  title: string;
  description?: string;
  author: string;
  commitDate: string;
  category: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  createdAt: string;
}

export interface Version {
  id: string;
  version: string;
  releaseDate: string;
  isCurrent: boolean;
  notes?: string;
  createdAt: string;
  createdBy: string;
  commits?: VersionCommit[];
}

export function useVersions() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch versions
      const versionsQuery = query(
        collection(db, COLLECTIONS.VERSIONS),
        orderBy('releaseDate', 'desc')
      );
      const versionsSnapshot = await getDocs(versionsQuery);

      const versionsData: Version[] = [];

      for (const versionDoc of versionsSnapshot.docs) {
        const data = versionDoc.data();

        // Fetch commits for this version
        const commitsQuery = query(
          collection(db, COLLECTIONS.VERSION_COMMITS),
          where('versionId', '==', versionDoc.id),
          orderBy('commitDate', 'desc')
        );
        const commitsSnapshot = await getDocs(commitsQuery);

        const commits: VersionCommit[] = commitsSnapshot.docs.map(commitDoc => {
          const commitData = commitDoc.data();
          return {
            id: commitDoc.id,
            versionId: versionDoc.id,
            title: commitData.title,
            description: commitData.description,
            author: commitData.author,
            commitDate: commitData.commitDate?.toDate?.()?.toISOString() || new Date().toISOString(),
            category: commitData.category || 'feature',
            createdAt: commitData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          };
        });

        const version: Version = {
          id: versionDoc.id,
          version: data.version,
          releaseDate: data.releaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
          isCurrent: data.isCurrent || false,
          notes: data.notes,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          createdBy: data.createdBy || 'Unknown',
          commits
        };

        versionsData.push(version);

        if (version.isCurrent) {
          setCurrentVersion(version);
        }
      }

      setVersions(versionsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError('Failed to load version information');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const addVersion = useCallback(async (versionData: {
    version: string;
    notes?: string;
    isCurrent?: boolean;
  }) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const batch = writeBatch(db);

      // If this is the new current version, unset all other current flags
      if (versionData.isCurrent) {
        const currentVersionsQuery = query(
          collection(db, COLLECTIONS.VERSIONS),
          where('isCurrent', '==', true)
        );
        const currentVersionsSnapshot = await getDocs(currentVersionsQuery);

        currentVersionsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isCurrent: false });
        });
      }

      // Add new version
      const versionRef = doc(collection(db, COLLECTIONS.VERSIONS));
      batch.set(versionRef, {
        version: versionData.version,
        releaseDate: serverTimestamp(),
        isCurrent: versionData.isCurrent || false,
        notes: versionData.notes || '',
        createdAt: serverTimestamp(),
        createdBy: user.email || 'Unknown'
      });

      await batch.commit();
      await fetchVersions();
    } catch (err) {
      console.error('Error adding version:', err);
      throw err;
    }
  }, [fetchVersions]);

  const addCommit = useCallback(async (versionId: string, commitData: {
    title: string;
    description?: string;
    author?: string;
    category?: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  }) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await addDoc(collection(db, COLLECTIONS.VERSION_COMMITS), {
        versionId,
        title: commitData.title,
        description: commitData.description || '',
        author: commitData.author || user.email || 'Unknown',
        commitDate: serverTimestamp(),
        category: commitData.category || 'feature',
        createdAt: serverTimestamp()
      });

      await fetchVersions();
    } catch (err) {
      console.error('Error adding commit:', err);
      throw err;
    }
  }, [fetchVersions]);

  const setCurrentVersionById = useCallback(async (versionId: string) => {
    try {
      const batch = writeBatch(db);

      // Unset all current flags
      const currentVersionsQuery = query(
        collection(db, COLLECTIONS.VERSIONS),
        where('isCurrent', '==', true)
      );
      const currentVersionsSnapshot = await getDocs(currentVersionsQuery);

      currentVersionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isCurrent: false });
      });

      // Set the new current version
      batch.update(doc(db, COLLECTIONS.VERSIONS, versionId), {
        isCurrent: true
      });

      await batch.commit();
      await fetchVersions();
    } catch (err) {
      console.error('Error setting current version:', err);
      throw err;
    }
  }, [fetchVersions]);

  return {
    versions,
    currentVersion,
    loading,
    error,
    addVersion,
    addCommit,
    setCurrentVersionById,
    refetch: fetchVersions
  };
}
