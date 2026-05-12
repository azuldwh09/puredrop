/**
 * DiagPanel -- on-screen diagnostic overlay for debugging auth + profile issues.
 *
 * HOW TO ENABLE:
 *   Add ?diag=1 to the URL (e.g. https://your-app/?diag=1)
 *   or set localStorage.setItem('puredrop_diag', '1') in the browser console.
 *
 * HOW TO DISABLE:
 *   Remove the ?diag param, or localStorage.removeItem('puredrop_diag')
 *
 * What it shows (each row = one step, color-coded):
 *   WAIT  = not started yet
 *   RUN   = in progress
 *   OK    = succeeded
 *   FAIL  = failed (with error message)
 *   SKIP  = intentionally skipped
 */

import { useState, useEffect, useRef } from 'react';

// Global log bus so any file can push steps without prop-drilling
const _listeners = new Set();
const _steps = [];

export function diagStep(id, status, detail) {
  // status: 'wait' | 'run' | 'ok' | 'fail' | 'skip'
  const ts = new Date().toISOString().substr(11, 12);
  const existing = _steps.find(s => s.id === id);
  if (existing) {
    existing.status = status;
    existing.detail = detail || existing.detail;
    existing.ts = ts;
  } else {
    _steps.push({ id, status, detail: detail || '', ts });
  }
  _listeners.forEach(fn => fn([..._steps]));
}

// Call this from anywhere: diagLog('some message')
export function diagLog(msg) {
  diagStep('log:' + msg, 'ok', msg);
}

function isEnabled() {
  try {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get('diag') === '1') return true;
    if (localStorage.getItem('puredrop_diag') === '1') return true;
  } catch (e) {}
  return false;
}

const STATUS_STYLE = {
  wait:  { bg: '#334155', color: '#94a3b8', label: 'WAIT' },
  run:   { bg: '#1e3a5f', color: '#60a5fa', label: 'RUN..' },
  ok:    { bg: '#14532d', color: '#4ade80', label: 'OK' },
  fail:  { bg: '#450a0a', color: '#f87171', label: 'FAIL' },
  skip:  { bg: '#292524', color: '#a8a29e', label: 'SKIP' },
};

export default function DiagPanel() {
  const [enabled] = useState(isEnabled);
  const [steps, setSteps] = useState([..._steps]);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    _listeners.add(setSteps);
    return () => _listeners.delete(setSteps);
  }, [enabled]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 8, right: 8, zIndex: 99999,
        width: minimized ? 80 : 320,
        maxHeight: minimized ? 36 : '80vh',
        background: 'rgba(2,6,23,0.93)',
        border: '1px solid rgba(148,163,184,0.3)',
        borderRadius: 10,
        fontFamily: 'monospace',
        fontSize: 10,
        color: '#e2e8f0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setMinimized(m => !m)}
        style={{
          padding: '4px 8px',
          background: 'rgba(30,41,59,0.95)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#7dd3fc', fontWeight: 'bold' }}>
          {minimized ? 'DIAG' : 'PureDrop Diagnostics'}
        </span>
        <span style={{ color: '#94a3b8' }}>{minimized ? '+' : '-'}</span>
      </div>

      {!minimized && (
        <div style={{ overflowY: 'auto', padding: '4px 6px', flex: 1 }}>
          {steps.length === 0 && (
            <div style={{ color: '#64748b', padding: 8 }}>Waiting for steps...</div>
          )}
          {steps.map((step, i) => {
            const s = STATUS_STYLE[step.status] || STATUS_STYLE.wait;
            return (
              <div
                key={step.id + i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  padding: '3px 4px', marginBottom: 2,
                  background: s.bg, borderRadius: 4,
                }}
              >
                <span style={{ color: s.color, minWidth: 38, flexShrink: 0, fontWeight: 'bold' }}>
                  {s.label}
                </span>
                <span style={{ flex: 1, wordBreak: 'break-all', color: '#e2e8f0' }}>
                  {step.id.startsWith('log:') ? step.detail : step.id}
                  {step.detail && !step.id.startsWith('log:') && (
                    <span style={{ color: '#94a3b8' }}> -- {step.detail}</span>
                  )}
                </span>
                <span style={{ color: '#475569', flexShrink: 0, fontSize: 9 }}>{step.ts}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {!minimized && (
        <div
          style={{
            padding: '3px 8px', background: 'rgba(15,23,42,0.9)',
            fontSize: 9, color: '#475569', flexShrink: 0,
          }}
        >
          Tap header to minimize | Add ?diag=1 to URL to enable
        </div>
      )}
    </div>
  );
}
