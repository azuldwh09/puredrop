import { useNetwork } from '../hooks/useNetwork';

export function OfflineBanner() {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: '#ff4444',
      color: 'white',
      textAlign: 'center',
      padding: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
    }}>
      ⚡ You're offline — scores will sync when reconnected
    </div>
  );
}
