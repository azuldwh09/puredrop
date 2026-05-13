// =============================================================================
// AUDIO PRIMER -- src/lib/audioPrimer.js
// =============================================================================
// Some Android WebView builds will silently drop Web Audio API output until a
// regular <audio> element has played at least once during the session. This
// is a documented quirk of the Chromium audio routing layer when embedded in
// an Android app -- the WebView only "claims" the system music stream after
// an explicit MediaPlayer playback, and oscillator output before that is
// routed to a phantom sink.
//
// Workaround: play a 1-frame data-URI silent WAV through an <audio> element
// on the first user gesture. Once it has played, all subsequent Web Audio
// output flows correctly.
//
// This is safe on every platform (browsers and iOS WebKit ignore the primer
// silently because their audio routing does not have this quirk).
// =============================================================================

import { dlog } from '@/lib/debugLog';

// 1-frame stereo silent WAV, base64-encoded. Total payload < 1KB.
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let primed = false;
let priming = false;

/**
 * Run the audio primer. Idempotent -- only the first call has effect.
 * Must be called from a real user-gesture handler (touchstart / click).
 */
export function primeAudio() {
  if (primed || priming) return;
  priming = true;
  try {
    const a = new Audio(SILENT_WAV_DATA_URI);
    a.volume = 0.01; // technically inaudible but non-zero so the stream is claimed
    a.play()
      .then(() => {
        primed = true;
        priming = false;
        dlog('Audio', 'primer: silent WAV played, media stream claimed');
      })
      .catch((err) => {
        priming = false;
        dlog('Audio', 'primer: play() failed', { err: String(err) });
      });
  } catch (err) {
    priming = false;
    dlog('Audio', 'primer: Audio() constructor threw', { err: String(err) });
  }
}

export function isAudioPrimed() {
  return primed;
}
