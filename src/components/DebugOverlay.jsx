// =============================================================================
// DEBUG OVERLAY -- src/components/DebugOverlay.jsx
// =============================================================================
// On-screen diagnostic log viewer. Shows the last ~60 dlog() entries in a
// fixed, semi-transparent panel anchored to the bottom of the screen.
//
// Mounted globally from main.jsx. Hidden by default; toggled via a small
// floating button in the top-right corner. State persists in localStorage so
// the overlay survives navigation and app restarts during a debug session.
//
// All styles are inline so this component is self-contained and cannot be
// affected by a CSS regression elsewhere in the app -- the goal is a
// debugging tool that ALWAYS works, even when the app is broken.
// =============================================================================

import { useEffect, useState } from 'react';
import { subscribeDebugLog, clearDebugLog } from '@/lib/debugLog';

const STORAGE_KEY = 'puredrop.debugOverlay.visible';

export default function DebugOverlay() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (_) { return false; }
  });
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const unsub = subscribeDebugLog(setLines);
    return unsub;
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, visible ? '1' : '0'); } catch (_) {}
  }, [visible]);

  // Floating toggle pill -- always rendered so the overlay can be turned on
  // even when the app's normal UI is unusable.
  const togglePill = (
    <button
      onClick={() => setVisible(v => !v)}
      style={{
        position: 'fixed',
        top: 4,
        right: 4,
        zIndex: 99999,
        padding: '2px 6px',
        fontSize: 10,
        fontFamily: 'monospace',
        background: visible ? 'rgba(123, 47, 190, 0.9)' : 'rgba(0, 0, 0, 0.55)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 4,
        cursor: 'pointer',
      }}
      aria-label="Toggle debug overlay"
    >
      {visible ? 'LOG ▼' : 'LOG'}
    </button>
  );

  if (!visible) return togglePill;

  return (
    <>
      {togglePill}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '40vh',
          overflowY: 'auto',
          background: 'rgba(0, 0, 0, 0.85)',
          color: '#9cf',
          fontFamily: 'monospace',
          fontSize: 10,
          lineHeight: 1.35,
          padding: '4px 6px 24px',
          zIndex: 99998,
          borderTop: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <button
            onClick={() => clearDebugLog()}
            style={{ fontSize: 10, padding: '2px 6px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: 3 }}
          >
            Clear
          </button>
          <span style={{ color: '#888' }}>{lines.length} entries</span>
        </div>
        {lines.length === 0 && <div style={{ color: '#666' }}>(no entries yet)</div>}
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{l}</div>
        ))}
      </div>
    </>
  );
}
