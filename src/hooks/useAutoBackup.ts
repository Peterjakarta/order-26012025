import { useEffect, useState } from 'react';
import {
  createBackup,
  shouldBackupToday,
  setLastBackupDate,
} from '../utils/backupService';

export function useAutoBackup() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState(false);

  useEffect(() => {
    const performAutoBackup = async () => {
      // Check if backup is needed today
      if (!shouldBackupToday()) {
        return;
      }

      // Wait a bit after app loads to not block initial render
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setIsBackingUp(true);
      setBackupError(null);

      try {
        const filename = await createBackup();
        setLastBackupDate();
        setBackupSuccess(true);
        console.log('Auto-backup completed:', filename);

        // Clear success message after 5 seconds
        setTimeout(() => setBackupSuccess(false), 5000);
      } catch (error) {
        console.error('Auto-backup failed:', error);
        setBackupError(
          error instanceof Error ? error.message : 'Failed to create backup'
        );
      } finally {
        setIsBackingUp(false);
      }
    };

    performAutoBackup();
  }, []);

  return {
    isBackingUp,
    backupError,
    backupSuccess,
  };
}
