// =============================================================================
// NETWORK STATUS HOOK -- src/hooks/useNetwork.js
// =============================================================================
// Exposes a reactive boolean indicating whether the device currently has
// internet connectivity. Subscribes to the browser's online/offline events.
//
// Usage:
//   const isOnline = useNetwork();
//   // isOnline: true = connected, false = no internet
//
// Note: navigator.onLine can be wrong in some edge cases (e.g. connected to a
// Wi-Fi router with no upstream internet). It is good enough for showing UI
// warnings but should not be relied on for critical data decisions.
// =============================================================================

import { useState, useEffect } from 'react';

export function useNetwork() {
  // Initialize from navigator.onLine so the value is correct on mount
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
