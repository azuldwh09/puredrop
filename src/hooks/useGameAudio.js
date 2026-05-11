import { useRef, useCallback, useEffect } from 'react';

// Drop sound variants — each is a small piano-like pluck at a different pitch/character
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

// Simple piano-style pluck: sine + quick decay + slight 2nd harmonic
function playPluck(ctx, masterGain, freq, type, dur, vol) {
  const osc  = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g    = ctx.createGain();

  osc.type      = type;
  osc.frequency.value = freq;
  osc2.type     = 'sine';
  osc2.frequency.value = freq * 2;

  const g2 = ctx.createGain();
  g2.gain.value = 0.12;

  osc.connect(g);
  osc2.connect(g2);
  g2.connect(g);
  g.connect(masterGain);

  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc.start(t);  osc.stop(t + dur);
  osc2.start(t); osc2.stop(t + dur);
}

export const useGameAudio = (soundEnabled = true) => {
  const audioContextRef  = useRef(null);
  const masterGainRef    = useRef(null);     // master volume bus
  const rainNoiseRef     = useRef(null);
  const rainGainRef      = useRef(null);
  const thunderTimerRef  = useRef(null);
  const pianoTimerRef    = useRef(null);
  const soundEnabledRef  = useRef(soundEnabled);

  // Keep ref in sync so callbacks see latest value without needing to re-register
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    masterGainRef.current = master;
  }, []);

  // ─── Background: rain noise ───────────────────────────────────────────────
  const startRain = useCallback((ctx) => {
    if (rainNoiseRef.current) return;

    const bufLen = ctx.sampleRate * 3;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    src.loop     = true;

    // Low-pass filter to make it soft rain, not hiss
    const lpf    = ctx.createBiquadFilter();
    lpf.type     = 'lowpass';
    lpf.frequency.value = 1800;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.09;

    src.connect(lpf);
    lpf.connect(rainGain);
    rainGain.connect(masterGainRef.current);
    src.start();

    rainNoiseRef.current = src;
    rainGainRef.current  = rainGain;
  }, []);

  // ─── Background: occasional soft thunder rumble ───────────────────────────
  const scheduleThunder = useCallback((ctx) => {
    const delay = 18000 + Math.random() * 30000; // 18–48 s
    thunderTimerRef.current = setTimeout(() => {
      if (!soundEnabledRef.current || !audioContextRef.current) return;

      const rumbleBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = rumbleBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);

      const src = ctx.createBufferSource();
      src.buffer = rumbleBuf;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 120; // very low — thunder rumble only

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.13, ctx.currentTime + 0.8);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5);
      g.gain.linearRampToValueAtTime(0,    ctx.currentTime + 3.0);

      src.connect(lpf);
      lpf.connect(g);
      g.connect(masterGainRef.current);
      src.start();

      scheduleThunder(ctx);
    }, delay);
  }, []);

  // ─── Background: gentle looping piano melody ──────────────────────────────
  // A soft pentatonic ambient pattern (C maj pentatonic)
  const PIANO_NOTES = [523, 659, 784, 880, 1046, 880, 784, 659]; // C5 E5 G5 A5 C6 …
  let pianoIdxRef = useRef(0);

  const schedulePianoNote = useCallback((ctx) => {
    const delay = 2200 + Math.random() * 1800; // 2.2–4s between notes
    pianoTimerRef.current = setTimeout(() => {
      if (!soundEnabledRef.current || !audioContextRef.current) return;

      const idx  = pianoIdxRef.current % PIANO_NOTES.length;
      const freq = PIANO_NOTES[idx];
      pianoIdxRef.current++;

      // Soft sine pluck
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type  = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(masterGainRef.current);

      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.start(t);
      osc.stop(t + 1.8);

      schedulePianoNote(ctx);
    }, delay);
  }, []);

  // ─── Start / stop all background layers ───────────────────────────────────
  const startBackgroundMusic = useCallback(() => {
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx || rainNoiseRef.current) return;

    startRain(ctx);
    scheduleThunder(ctx);
    schedulePianoNote(ctx);
  }, [initAudio, startRain, scheduleThunder, schedulePianoNote]);

  const stopBackgroundMusic = useCallback(() => {
    if (rainNoiseRef.current) {
      try { rainNoiseRef.current.stop(); } catch (_) {}
      rainNoiseRef.current = null;
      rainGainRef.current  = null;
    }
    clearTimeout(thunderTimerRef.current);
    clearTimeout(pianoTimerRef.current);
    thunderTimerRef.current = null;
    pianoTimerRef.current   = null;
  }, []);

  // ─── SFX ──────────────────────────────────────────────────────────────────
  const playcatch = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const v = DROP_VARIANTS[Math.floor(Math.random() * DROP_VARIANTS.length)];
    playPluck(ctx, masterGainRef.current, v.freq, v.type, v.dur, v.vol);
  }, [initAudio]);

  const playMiss = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(masterGainRef.current);

    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.22);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  }, [initAudio]);

  const playCatMeow = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc    = ctx.createOscillator();
    const g      = ctx.createGain();
    const lfo    = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.connect(g);
    lfoGain.connect(osc.frequency);
    lfo.connect(lfoGain);
    g.connect(masterGainRef.current);

    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    lfo.frequency.value = 12;
    lfoGain.gain.value  = 80;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);  lfo.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3); lfo.stop(ctx.currentTime + 0.3);
  }, [initAudio]);

  const playSplash = useCallback(() => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const bufLen = ctx.sampleRate * 0.2;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = buf;
    src.connect(g);
    g.connect(masterGainRef.current);

    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    src.start(ctx.currentTime);
  }, [initAudio]);

  const playBeep = useCallback((frequency = 800, duration = 0.1, volume = 0.3) => {
    if (!soundEnabledRef.current) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(masterGainRef.current);

    osc.frequency.value = frequency;
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }, [initAudio]);

  const playPowerUp = useCallback(() => {
    if (!soundEnabledRef.current) return;
    playBeep(600, 0.1, 0.18);
    setTimeout(() => playBeep(1000, 0.1, 0.18), 80);
    setTimeout(() => playBeep(1400, 0.15, 0.18), 160);
  }, [playBeep]);

  // Mute/unmute master gain instead of stopping everything
  useEffect(() => {
    if (!masterGainRef.current) return;
    masterGainRef.current.gain.value = soundEnabled ? 1 : 0;
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      stopBackgroundMusic();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopBackgroundMusic]);

  return {
    playBeep,
    playcatch,
    playMiss,
    playCatMeow,
    playSplash,
    playPowerUp,
    startBackgroundMusic,
    stopBackgroundMusic,
  };
};