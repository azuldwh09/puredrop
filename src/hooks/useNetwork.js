import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Get initial status
    Network.getStatus().then(status => setIsOnline(status.connected));

    // Listen for changes
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
      console.log('Network status changed:', status.connected ? 'online' : 'offline');
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return { isOnline };
}
