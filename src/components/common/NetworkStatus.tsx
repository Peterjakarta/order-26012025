import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { getNetworkStatus } from '../../lib/firebase';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(getNetworkStatus());
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleConnectionChange = (e: CustomEvent) => {
      const newStatus = e.detail.status;
      setStatus(newStatus);
      setVisible(newStatus !== 'connected');
      
      // Auto-hide after 5 seconds if connected
      if (newStatus === 'connected') {
        setTimeout(() => setVisible(false), 5000);
      }
    };

    window.addEventListener('firebase-connection', handleConnectionChange as EventListener);

    // Check initial status
    setIsOnline(getNetworkStatus());

    return () => {
      window.removeEventListener('firebase-connection', handleConnectionChange as EventListener);
    };
  }, []);

  if (!visible) return null;

  const statusConfig = {
    connected: {
      icon: <Wifi className="w-4 h-4 text-green-500" />,
      bg: 'bg-green-50',
      text: 'text-green-800',
      message: 'Connected'
    },
    disconnected: {
      icon: <WifiOff className="w-4 h-4 text-red-500" />,
      bg: 'bg-red-50',
      text: 'text-red-800',
      message: 'Offline'
    },
    reconnecting: {
      icon: <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />,
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      message: 'Reconnecting...'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${config.bg} ${config.text} px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}>
        {config.icon}
        <span className="text-sm font-medium whitespace-nowrap">
          {config.message}
        </span>
      </div>
    </div>
  );
}