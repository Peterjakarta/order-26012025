import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { getNetworkStatus } from '../../lib/firebase';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(getNetworkStatus());
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOnline(getNetworkStatus());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isOnline ? 'Reconnecting...' : 'Working offline'}
        </span>
      </div>
    </div>
  );
}