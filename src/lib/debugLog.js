// =============================================================================
// ON-SCREEN DEBUG LOG -- src/lib/debugLog.js
// =============================================================================
// A tiny pub/sub-style ring buffer for diagnostic messages that can be
// rendered as an overlay on the device (no chrome://inspect required).
//
// Usage:
//   import { dlog, subscribeDebugLog } from '@/lib/debugLog';
//   dlog('Audio', 'context created', { state: ctx.state });
//
// The DebugOverlay component subscribes via subscribeDebugLog() and re-renders
// whenever a new entry is pushed.
//
// We keep only the last MAX entries so the overlay doesn't grow unbounded.
// =============================================================================

const MAX = 60;
const entries = [];
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn([...entries]); } catch (_) { /* listener errors should not break logging */ }
  }
}

/**
 * Append a debug entry.
 * @param {string} tag   - short category label (e.g. 'Audio', 'Auth')
 * @param {string} msg   - the message text
 * @param {object} [data] - optional structured payload, JSON-stringified
 */
export function dlog(tag, msg, data) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  let line = ts + ' [' + tag + '] ' + msg;
  if (data !== undefined) {
    try { line += ' ' + JSON.stringify(data); }
    catch (_) { line += ' [unserialisable]'; }
  }
  entries.push(line);
  if (entries.length > MAX) entries.shift();
  // Also mirror to the regular console so remote-debug still works.
  // eslint-disable-next-line no-console
  console.log(line);
  notify();
}

/** Subscribe to log changes. Returns an unsubscribe function. */
export function subscribeDebugLog(fn) {
  listeners.add(fn);
  try { fn([...entries]); } catch (_) {}
  return () => listeners.delete(fn);
}

/** Clear all entries. */
export function clearDebugLog() {
  entries.length = 0;
  notify();
}
