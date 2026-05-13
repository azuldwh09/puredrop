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

  // Quick attack + exponential decay = pluck character
  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

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
  const thunderTimerRef = useRef(null);  // setInterval handle for thunder scheduling
  const pianoTimerRef   = useRef(null);  // setInterval handle for background piano
  const soundEnabledRef = useRef(soundEnabled);

  // Keep the ref in sync without re-creating callbacks
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // -- AudioContext initialization -------------------------------------------
  // Called lazily on first sound event to avoid "AudioContext not allowed before
  // user gesture" warnings on Android WebView.
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    const ctx    = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    audioContextRef.current = ctx;
    masterGainRef.current   = master;
  }, []);

  // ==========================================================================
  // Ambient rain loop
  // ==========================================================================
  // Generates a continuous band-pass-filtered white noise to simulate rain.
  // Volume fades in slowly over 2 seconds so it doesn't startle the player.
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
  }, [initAudio]);

  // ==========================================================================
  // Stop ambient rain
  // ==========================================================================
  const stopRain = useCallback(() => {
    if (rainNoiseRef.current) {
      try { rainNoiseRef.current.stop(); } catch (_) {}
      rainNoiseRef.current = null;
    }
    if (thunderTimerRef.current) {
      clearInterval(thunderTimerRef.current);
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
  }, []);

  // ==========================================================================
  // Drop caught sound
  // ==========================================================================
  // Picks a random pitch variant and plays a piano pluck.
  const playDropCatch = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx    = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

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
      setTimeout(() => playPluck(ctx, master, freq, 'sine', 0.5, 0.2), i * 80);
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
      setTimeout(() => playPluck(ctx, master, freq, 'triangle', 0.6, 0.18), i * 90);
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
      setTimeout(() => playPluck(ctx, master, freq, 'sine', 0.2, 0.12), i * 40);
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

    const tick = () => {
      if (!soundEnabledRef.current) return;
      const ctx    = audioContextRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;
      const freq = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      playPluck(ctx, master, freq, 'sine', 0.8, 0.05); // very quiet (0.05 vol)
    };

    pianoTimerRef.current = setInterval(tick, 6000 + Math.random() * 6000);
  }, [initAudio]);

  const stopAmbientPiano = useCallback(() => {
    if (pianoTimerRef.current) {
      clearInterval(pianoTimerRef.current);
      pianoTimerRef.current = null;
    }
  }, []);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================
  useEffect(() => {
    return () => {
      stopRain();
      stopAmbientPiano();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
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
    initAudio,         // call on first user gesture to unlock AudioContext
  };
};
