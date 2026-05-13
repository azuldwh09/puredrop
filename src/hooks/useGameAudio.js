// =============================================================================
// GAME AUDIO HOOK -- src/hooks/useGameAudio.js
// =============================================================================
// Manages all in-game sound effects using the Web Audio API.
//
// Why Web Audio API (not <audio> tags)?
//   <audio> tags have latency and concurrency limits on mobile browsers.
//   Web Audio API lets us generate sounds procedurally (no audio files to load)
//   and play many overlapping sounds simultaneously with zero latency.
//
// Sound categories:
//   - Drop catch:   A random piano pluck from a set of 8 musical pitches.
//                   Varied so repeated catches don't sound robotic.
//   - Miss:         A dull "thud" low-pass noise burst.
//   - Win:          A short ascending arpeggio (C-E-G-C).
//   - Lose:         A descending minor chord.
//   - Power-up:     A bright sparkle sweep.
//   - Spill:        A splash -- filtered noise burst + pitch drop.
//   - Ambient rain: A continuous filtered noise loop for immersion.
//   - Thunder:      Random low-frequency rumble hits during rain.
//   - Background piano: Occasional random soft note to fill silence.
//
// soundEnabled prop:
//   When false, all sound functions early-return without playing anything.
//   The AudioContext is still created (to avoid latency on first enable) but
//   the master gain is set to 0.
// =============================================================================

import { useRef, useCallback, useEffect } from 'react';
import { dlog } from '@/lib/debugLog';
import { primeAudio } from '@/lib/audioPrimer';

// -- Piano pluck pitch library -------------------------------------------------
// 8 different pitches and waveforms so consecutive drops don't all sound the same.
const DROP_VARIANTS = [
  { freq: 1046, type: 'sine',     dur: 0.35, vol: 0.18 }, // C6
  { freq:  988, type: 'sine',     dur: 0.30, vol: 0.16 }, // B5
  { freq:  880, type: 'sine',     dur: 0.40, vol: 0.18 }, // A5
  { freq: 1175, type: 'sine',     dur: 0.28, vol: 0.15 }, // D6
  { freq:  784, type: 'sine',     dur: 0.38, vol: 0.17 }, // G5
  { freq: 1319, type: 'sine',     dur: 0.25, vol: 0.14 }, // E6
  { freq:  932, type: 'triangle', dur: 0.32, vol: 0.16 }, // Bb5
  { freq: 1109, type: 'triangle', dur: 0.30, vol: 0.15 }, // C#6
];

// -- Piano pluck synthesis -----------------------------------------------------
// Creates a piano-like tone: fundamental + 2nd harmonic with exponential decay.
// Two oscillators are combined to simulate the brightness of a struck string.
function playPluck(ctx, masterGain, freq, type, dur, vol) {
  const osc  = ctx.createOscillator();  // fundamental
  const osc2 = ctx.createOscillator();  // 2nd harmonic (adds brightness)
  const g    = ctx.createGain();        // envelope

  osc.type             = type;
  osc.frequency.value  = freq;
  osc2.type            = 'sine';
  osc2.frequency.value = freq * 2;

  const g2 = ctx.createGain();
  g2.gain.value = 0.12; // 2nd harmonic at 12% volume (subtle, not dominant)

  osc.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  g.connect(masterGain);

  // Quick attack + exponential decay = pluck character.
  // Start near-zero and ramp up over 5ms to avoid the instantaneous 0->vol
  // jump that causes audible clicks/pops on some devices (especially older
  // Android speakers and Bluetooth output paths).
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  // onended disconnect releases the audio graph nodes promptly instead of
  // waiting on GC. Important on Safari where retained nodes can pile up.
  const cleanup = () => {
    try { osc.disconnect(); }  catch (_) {}
    try { osc2.disconnect(); } catch (_) {}
    try { g.disconnect(); }    catch (_) {}
    try { g2.disconnect(); }   catch (_) {}
  };
  osc.onended = cleanup;

  osc.start(t);  osc.stop(t + dur);
  osc2.start(t); osc2.stop(t + dur);
}

// =============================================================================
// useGameAudio hook
// =============================================================================
export const useGameAudio = (soundEnabled = true) => {
  // -- AudioContext and gain nodes (created once, never recreated) -----------
  const audioContextRef = useRef(null);  // main Web Audio context
  const masterGainRef   = useRef(null);  // master volume bus (all sounds route through this)
  const rainNoiseRef    = useRef(null);  // reference to the rain noise source node
  const rainGainRef     = useRef(null);  // gain node for rain volume
  const thunderTimerRef = useRef(null);  // setTimeout handle for next thunder (recursive)
  const pianoTimerRef   = useRef(null);  // setTimeout handle for next piano tick (recursive)
  const soundEnabledRef = useRef(soundEnabled);
  const firstDropLoggedRef = useRef(false);
  // Tracks every setTimeout id created by the multi-shot sequence sounds
  // (playWin/playLose/playPowerUp). Cleared en masse on unmount so timers
  // can't fire into a closed AudioContext.
  const pendingTimeoutsRef = useRef(new Set());
  // Keep ref in sync on every render (cheap, runs during render -- guarantees
  // the latest value is read by callbacks even before useEffect commits).
  soundEnabledRef.current = soundEnabled;

  // Wrapper around setTimeout that registers the id in pendingTimeoutsRef so
  // the unmount cleanup can clear every pending callback in one pass. Used by
  // the multi-note sequence sounds (playWin / playLose / playPowerUp).
  const scheduleTimeout = (fn, delay) => {
    const id = setTimeout(() => {
      pendingTimeoutsRef.current.delete(id);
      fn();
    }, delay);
    pendingTimeoutsRef.current.add(id);
    return id;
  };

  // -- AudioContext initialization -------------------------------------------
  // Called lazily on the first user gesture to satisfy the autoplay policy
  // on Android WebView / iOS Safari.
  //
  // Verbose logging is intentional -- left in production so remote-debug
  // (chrome://inspect) sessions can immediately show whether audio is
  // unlocking on the device. The cost is a few console messages per game.
  const initAudio = useCallback(() => {
    // Some Android WebView builds will not route Web Audio output until a
    // regular <audio> element has played. Fire the silent-WAV primer first.
    primeAudio();

    // AudioContext lookup. The 'webkitAudioContext' fallback covers older
    // iOS Safari builds (pre-iOS 14.5) and some Android WebViews that still
    // expose only the vendor-prefixed constructor. We read it via bracket
    // notation so static analyzers don't flag the non-standard property --
    // 'window.webkitAudioContext' is not in the standard Window type but is
    // valid at runtime in every browser that needs the fallback.
    const Ctx = window.AudioContext || window['webkitAudioContext'];
    if (!Ctx) {
      dlog('Audio', 'No AudioContext support in this WebView');
      return;
    }

    // Path 1: context already exists.
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      dlog('Audio', 'initAudio: existing context', { state: ctx.state });

      // (#6) If the OS closed the context (can happen on Android after a
      // long background pause or audio focus loss), drop the stale reference
      // and re-enter this function to build a fresh one.
      if (ctx.state === 'closed') {
        dlog('Audio', 'existing context closed -- recreating');
        audioContextRef.current = null;
        masterGainRef.current   = null;
        return initAudio();
      }

      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        ctx.resume()
          .then(() => dlog('Audio', 'resumed', { state: ctx.state }))
          .catch(err => dlog('Audio', 'resume failed', { err: String(err) }));
      }
      return;
    }

    // Path 2: create a fresh context.
    let ctx;
    try { ctx = new Ctx(); }
    catch (err) {
      dlog('Audio', 'new AudioContext() threw', { err: String(err) });
      return;
    }
    dlog('Audio', 'context created', { state: ctx.state, sampleRate: ctx.sampleRate });

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    audioContextRef.current = ctx;
    masterGainRef.current   = master;

    // Resume immediately if needed. This is the call that consumes the user
    // gesture -- it MUST happen synchronously inside the gesture handler.
    if (ctx.state === 'suspended') {
      ctx.resume()
        .then(() => dlog('Audio', 'post-create resume ok', { state: ctx.state }))
        .catch(err => dlog('Audio', 'post-create resume failed', { err: String(err) }));
    }

    // Warm-up silent oscillator -- known workaround for Android WebView
    // dropping the first audio output after resume().
    try {
      const warm = ctx.createOscillator();
      const wg   = ctx.createGain();
      wg.gain.value = 0.0001;
      warm.connect(wg); wg.connect(master);
      warm.start(ctx.currentTime);
      warm.stop(ctx.currentTime + 0.05);
    } catch (err) {
      dlog('Audio', 'warm-up oscillator failed', { err: String(err) });
    }
  }, []);

  // Exposed diagnostic: plays a clearly-audible 440Hz beep for 200ms. Hooked
  // up to a button in the Settings modal so the user can verify audio without
  // playing a level. If this beep is silent on device, the problem is at the
  // AudioContext / system-volume layer, NOT at the game-event layer.
  const playTestTone = useCallback(() => {
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) {
      dlog('Audio', 'playTestTone: no ctx/master after init');
      return;
    }
    dlog('Audio', 'playTestTone fired', { state: ctx.state });
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g); g.connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }, [initAudio]);

  // ==========================================================================
  // Thunder scheduler (recursive setTimeout)
  // ==========================================================================
  // setInterval with a random delay only randomizes ONCE at creation, then
  // fires at the same cadence forever. To get a fresh random interval each
  // strike (8-20s), we recursively schedule with setTimeout. The handle is
  // stored on thunderTimerRef so cleanup can cancel a pending strike.
  //
  // Defined as a ref-stored function so playThunder and stopRain (declared
  // below) can both reference it without TDZ issues.
  const scheduleThunderRef = useRef(null);
  scheduleThunderRef.current = () => {
    if (!soundEnabledRef.current) return;
    const delay = 8000 + Math.random() * 12000; // 8-20 seconds
    thunderTimerRef.current = setTimeout(() => {
      // Re-check on fire: rain may have stopped while we were waiting.
      if (rainNoiseRef.current && soundEnabledRef.current) {
        // playThunder is closed over via the outer scope at call time.
        try { playThunderRef.current && playThunderRef.current(); } catch (_) {}
        scheduleThunderRef.current && scheduleThunderRef.current();
      } else {
        thunderTimerRef.current = null;
      }
    }, delay);
  };
  // Forward declaration so scheduleThunder can call playThunder before it's
  // defined further down. Filled in below once playThunder exists.
  const playThunderRef = useRef(null);

  // ==========================================================================
  // Ambient rain loop
  // ==========================================================================
  // Generates a continuous band-pass-filtered white noise to simulate rain.
  // Volume fades in slowly over 2 seconds so it doesn't startle the player.
  // Also kicks off the recursive thunder scheduler so distant rumbles play
  // randomly every 8-20 seconds for the lifetime of the rain.
  const startRain = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    // Stop any existing rain before starting a new one
    if (rainNoiseRef.current) {
      try { rainNoiseRef.current.stop(); } catch (_) {}
    }

    // Create white noise buffer (2 seconds, looping)
    const bufferSize = ctx.sampleRate * 2;
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source  = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop   = true;

    // Band-pass filter: keeps only the mid-frequencies that sound like rain
    const filter         = ctx.createBiquadFilter();
    filter.type          = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value         = 0.4;

    // Gain node for rain volume (separate from master so we can fade it)
    const rainGain    = ctx.createGain();
    rainGain.gain.setValueAtTime(0, ctx.currentTime);
    rainGain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 2); // gentle fade-in

    source.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(master);
    source.start();

    rainNoiseRef.current = source;
    rainGainRef.current  = rainGain;

    // Kick off random thunder scheduling. If one is already pending we leave
    // it alone (startRain may be called again after a brief stop/start).
    if (!thunderTimerRef.current && scheduleThunderRef.current) {
      scheduleThunderRef.current();
    }
  }, [initAudio]);

  // ==========================================================================
  // Stop ambient rain
  // ==========================================================================
  const stopRain = useCallback(() => {
    // (#3) Disconnect every node in the rain graph so they release immediately
    // instead of waiting on the audio-graph GC. Without this, long sessions
    // that toggle rain on/off can accumulate dozens of orphaned filter/gain
    // nodes that quietly use CPU.
    if (rainNoiseRef.current) {
      try { rainNoiseRef.current.stop(); }       catch (_) {}
      try { rainNoiseRef.current.disconnect(); } catch (_) {}
      rainNoiseRef.current = null;
    }
    if (rainGainRef.current) {
      try { rainGainRef.current.disconnect(); }  catch (_) {}
      rainGainRef.current = null;
    }
    // (#1) Thunder is scheduled with setTimeout (not setInterval). Use the
    // matching clearer or the cancel becomes a no-op and a strike still
    // fires after stopRain returns.
    if (thunderTimerRef.current) {
      clearTimeout(thunderTimerRef.current);
      thunderTimerRef.current = null;
    }
  }, []);

  // ==========================================================================
  // Thunder rumble
  // ==========================================================================
  // Plays a low-frequency noise burst to simulate distant thunder.
  // Scheduled randomly every 8-20 seconds while rain is playing.
  const playThunder = useCallback(() => {
    if (!soundEnabledRef.current) return;
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    // (no-op marker for scheduleThunder forward-ref wiring below)

    const bufferSize = ctx.sampleRate * 1.2;
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));

    const source  = ctx.createBufferSource();
    source.buffer = buffer;

    // Low-pass filter: only sub-100Hz content for deep rumble
    const filter         = ctx.createBiquadFilter();
    filter.type          = 'lowpass';
    filter.frequency.value = 90;

    const g = ctx.createGain();
    g.gain.value = 0.18;

    source.connect(filter);
    filter.connect(g);
    g.connect(master);
    source.start();
    source.onended = () => {
      try { source.disconnect(); } catch (_) {}
      try { filter.disconnect(); } catch (_) {}
      try { g.disconnect(); }      catch (_) {}
    };
  }, []);
  // Wire the forward ref now that playThunder exists. scheduleThunder uses
  // playThunderRef.current to invoke this without a circular dep.
  playThunderRef.current = playThunder;

  // ==========================================================================
  // Drop caught sound
  // ==========================================================================
  // Picks a random pitch variant and plays a piano pluck.
  const playDropCatch = useCallback(() => {
    if (!soundEnabledRef.current) {
      if (!firstDropLoggedRef.current) {
        firstDropLoggedRef.current = true;
        dlog('Audio', 'playDropCatch: sound disabled (soundEnabledRef=false)');
      }
      return;
    }
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) {
      dlog('Audio', 'playDropCatch: missing ctx/master', { hasCtx: !!ctx, hasMaster: !!master });
      return;
    }

    if (!firstDropLoggedRef.current) {
      firstDropLoggedRef.current = true;
      dlog('Audio', 'playDropCatch: first call', { state: ctx.state, masterGain: master.gain.value });
    }

    const v = DROP_VARIANTS[Math.floor(Math.random() * DROP_VARIANTS.length)];
    playPluck(ctx, master, v.freq, v.type, v.dur, v.vol);
  }, [initAudio]);

  // ==========================================================================
  // Drop missed sound
  // ==========================================================================
  // A short filtered noise burst -- dull "thud" to signal a miss.
  const playMiss = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const bufSize = Math.floor(ctx.sampleRate * 0.12);
    const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.value = 300;

    const g = ctx.createGain();
    g.gain.value = 0.1;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start();
  }, [initAudio]);

  // ==========================================================================
  // Level won sound
  // ==========================================================================
  // A short ascending arpeggio: C5 -> E5 -> G5 -> C6 with 80ms spacing.
  const playWin = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      scheduleTimeout(() => playPluck(ctx, master, freq, 'sine', 0.5, 0.2), i * 80);
    });
  }, [initAudio]);

  // ==========================================================================
  // Level lost sound
  // ==========================================================================
  // A short descending minor chord: Eb5 -> C5 -> A4 with 90ms spacing.
  const playLose = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const notes = [622, 523, 440]; // Eb5, C5, A4
    notes.forEach((freq, i) => {
      scheduleTimeout(() => playPluck(ctx, master, freq, 'triangle', 0.6, 0.18), i * 90);
    });
  }, [initAudio]);

  // ==========================================================================
  // Power-up collected sound
  // ==========================================================================
  // An ascending sparkle sweep (five quick rising tones).
  const playPowerUp = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const freqs = [800, 1000, 1200, 1500, 1900];
    freqs.forEach((freq, i) => {
      scheduleTimeout(() => playPluck(ctx, master, freq, 'sine', 0.2, 0.12), i * 40);
    });
  }, [initAudio]);

  // ==========================================================================
  // Spill sound
  // ==========================================================================
  // A splash effect: filtered noise burst (the "splash") + pitch-dropping
  // oscillator (the "glug"). Combined they sound like water spilling.
  const playSpill = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    // Noise burst (splash)
    const bufSize = Math.floor(ctx.sampleRate * 0.3);
    const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.4));

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value         = 1.5;

    const g = ctx.createGain();
    g.gain.value = 0.3;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start();

    // Pitch-drop oscillator (glug)
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.2, ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(og); og.connect(master);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }, [initAudio]);

  // ==========================================================================
  // Background ambient piano
  // ==========================================================================
  // Plays a soft random note every 6-12 seconds to fill silence.
  // Uses only notes from a pentatonic scale so it always sounds pleasant.
  const startAmbientPiano = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    if (pianoTimerRef.current) return; // already running

    // Pentatonic scale notes (C, D, E, G, A across 3 octaves)
    const pentatonic = [
      261, 294, 330, 392, 440,   // C4 D4 E4 G4 A4
      523, 587, 659, 784, 880,   // C5 D5 E5 G5 A5
      1046, 1175, 1319,          // C6 D6 E6
    ];

    // (#2/#7) Recursive setTimeout instead of setInterval -- this is the only
    // way to get a *fresh* random delay between each note. setInterval with a
    // random arg picks the delay once and then fires at that constant cadence
    // forever, which is musically boring and not what the comment promises.
    const tick = () => {
      pianoTimerRef.current = null;
      if (!soundEnabledRef.current) return;
      const ctx    = audioContextRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      playPluck(ctx, master, freq, 'sine', 0.8, 0.05); // very quiet (0.05 vol)
      // Schedule the next note with a brand-new random delay (6-12s).
      pianoTimerRef.current = setTimeout(tick, 6000 + Math.random() * 6000);
    };
    pianoTimerRef.current = setTimeout(tick, 6000 + Math.random() * 6000);
  }, [initAudio]);

  const stopAmbientPiano = useCallback(() => {
    // (#2) Matching clearTimeout for the recursive setTimeout chain above.
    if (pianoTimerRef.current) {
      clearTimeout(pianoTimerRef.current);
      pianoTimerRef.current = null;
    }
  }, []);

  // ==========================================================================
  // Mirror soundEnabled -> master gain
  // ==========================================================================
  // Each per-sound callback already early-returns when soundEnabled is false,
  // but we also drive the master gain so that:
  //   (a) any in-flight tail (rain noise, decaying piano notes) goes silent
  //       instantly when the user toggles sound off,
  //   (b) the comment at the top of the file -- "master gain goes to 0 when
  //       soundEnabled is false" -- is actually true.
  // Uses linearRampToValueAtTime for a 50ms fade to avoid clicks on toggle.
  useEffect(() => {
    const master = masterGainRef.current;
    const ctx    = audioContextRef.current;
    if (!master || !ctx) return;
    try {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(soundEnabled ? 1 : 0, t + 0.05);
    } catch (_) {
      // Fallback: synchronous assignment if scheduling isn't available.
      master.gain.value = soundEnabled ? 1 : 0;
    }
  }, [soundEnabled]);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================
  useEffect(() => {
    return () => {
      stopRain();
      stopAmbientPiano();
      // (#4) Cancel every pending sequence-sound timeout so the callbacks
      // can't fire into the about-to-be-closed AudioContext.
      pendingTimeoutsRef.current.forEach(id => clearTimeout(id));
      pendingTimeoutsRef.current.clear();
      // (#5) Null the ref BEFORE calling close() and only close if the
      // context isn't already closed. Prevents the race where a stale
      // callback grabs the ref after we've started closing it, and avoids
      // a 'cannot close a context that is already closed' InvalidStateError.
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      masterGainRef.current   = null;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    };
  }, [stopRain, stopAmbientPiano]);

  // -- Public API -------------------------------------------------------------
  return {
    playDropCatch,    // play when a clean drop is caught
    playMiss,         // play when a drop is missed
    playWin,          // play when the level is won
    playLose,         // play when the level is lost
    playPowerUp,      // play when a power-up is collected
    playSpill,        // play when the cup spills
    startRain,        // start the ambient rain loop
    stopRain,         // stop the ambient rain loop
    playThunder,      // play a single thunder rumble
    startAmbientPiano, // start the background piano ticks
    stopAmbientPiano,  // stop the background piano ticks
    startBackgroundMusic: startAmbientPiano, // alias
    stopBackgroundMusic:  stopAmbientPiano,  // alias
    playcatch:    playDropCatch, // alias (legacy name)
    playCatMeow:  playMiss,      // alias -- no dedicated meow sound yet, fall back to miss
    initAudio,         // call on first user gesture to unlock AudioContext
    playTestTone,      // diagnostic 440Hz beep -- wired to Settings modal
  };
};
