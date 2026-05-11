import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CUP_SKINS } from '../game/constants';
import { showNewCupAd } from '../api/admob';

const CUP_MAX = 5;
const CUP_REFILL_HOURS = 3;

export default function HomeScreen({ onPlay, onLeaderboard, onSkins, onSettings }) {
  const {
    highestLevel, totalScore, streak, cups,
    selectedCupSkin, checkCupRefill, lastRefillTime,
  } = useGameStore();
  const skin = CUP_SKINS.find(s => s.id === selectedCupSkin) || CUP_SKINS[0];
  const [adLoading, setAdLoading] = useState(false);
  const [adMsg, setAdMsg] = useState('');

  useEffect(() => {
    checkCupRefill();
    const interval = setInterval(checkCupRefill, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const nextRefill = () => {
    if (cups >= CUP_MAX) return null;
    if (!lastRefillTime) return `${CUP_REFILL_HOURS}h`;
    const next = new Date(lastRefillTime).getTime() + CUP_REFILL_HOURS * 60 * 60 * 1000;
    const diff = Math.max(0, next - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const handleWatchAd = async () => {
    setAdLoading(true);
    setAdMsg('');
    const earned = await showNewCupAd();
    if (earned) {
      useGameStore.getState().useCup(); // decrement to trigger store update... 
      // Actually add a cup instead
      const store = useGameStore.getState();
      useGameStore.setState({ cups: Math.min(CUP_MAX, store.cups + 1) });
      setAdMsg('🥤 You earned a cup!');
    } else {
      setAdMsg('Ad skipped — no cup earned.');
    }
    setAdLoading(false);
    setTimeout(() => setAdMsg(''), 3000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💧 PureDrop</h1>
        <p style={styles.subtitle}>Catch the pure, dodge the contaminated</p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.stat}><span style={styles.statVal}>⚡ {streak}</span><span style={styles.statLabel}>Streak</span></div>
        <div style={styles.stat}><span style={styles.statVal}>🏆 {highestLevel}</span><span style={styles.statLabel}>Best Level</span></div>
        <div style={styles.stat}><span style={styles.statVal}>🎯 {totalScore.toLocaleString()}</span><span style={styles.statLabel}>Total Score</span></div>
      </div>

      {/* Cups / lives */}
      <div style={styles.cupsRow}>
        {Array.from({ length: CUP_MAX }).map((_, i) => (
          <span key={i} style={{ fontSize: 28, opacity: i < cups ? 1 : 0.2 }}>🥤</span>
        ))}
      </div>
      {cups < CUP_MAX && (
        <p style={styles.refillText}>Next free cup in {nextRefill()}</p>
      )}
      {adMsg ? <p style={styles.adMsg}>{adMsg}</p> : null}

      <div style={styles.cupPreview}>
        <div style={{
          ...styles.cupShape,
          borderColor: skin.color === 'rainbow' ? 'transparent' : skin.color,
          background: skin.color === 'rainbow'
            ? 'linear-gradient(135deg,red,orange,yellow,green,blue,purple)'
            : `${skin.color}33`,
        }}>
          <span style={{ fontSize: 32 }}>🥤</span>
        </div>
        <p style={{ color: '#aaa', marginTop: 8, fontSize: 14 }}>{skin.label}</p>
      </div>

      <button
        style={{ ...styles.playBtn, opacity: cups <= 0 ? 0.4 : 1 }}
        onClick={onPlay}
        disabled={cups <= 0}
      >
        {cups <= 0 ? '⏳ No cups left' : `▶ Play — Level ${highestLevel}`}
      </button>

      {/* Watch ad to earn a cup — shown when out of cups */}
      {cups <= 0 && (
        <button
          style={styles.adBtn}
          onClick={handleWatchAd}
          disabled={adLoading}
        >
          {adLoading ? '⏳ Loading ad...' : '📺 Watch Ad for a Free Cup'}
        </button>
      )}

      <div style={styles.secondaryBtns}>
        <button style={styles.secBtn} onClick={onSkins}>🎨 Skins</button>
        <button style={styles.secBtn} onClick={onLeaderboard}>🏅 Leaderboard</button>
        <button style={styles.secBtn} onClick={onSettings}>⚙️ Settings</button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628 0%,#1a3a5c 100%)', padding: 24, color: 'white' },
  header: { textAlign: 'center', marginBottom: 24 },
  title: { fontSize: 42, margin: 0, letterSpacing: 2 },
  subtitle: { color: '#4fc3f7', fontSize: 16, marginTop: 8 },
  statsRow: { display: 'flex', gap: 16, marginBottom: 20 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 16px' },
  statVal: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 4 },
  cupsRow: { display: 'flex', gap: 8, marginBottom: 4 },
  refillText: { color: '#aaa', fontSize: 12, marginBottom: 8, marginTop: 0 },
  adMsg: { color: '#4fc3f7', fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  cupPreview: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 },
  cupShape: { width: 70, height: 70, borderRadius: 28, border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  playBtn: { background: '#4fc3f7', color: '#0a1628', border: 'none', borderRadius: 14, padding: '16px 48px', fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10, width: '100%', maxWidth: 320 },
  adBtn: { background: 'linear-gradient(135deg,#7B2FBE,#4fc3f7)', color: 'white', border: 'none', borderRadius: 14, padding: '14px 24px', fontSize: 15, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16, width: '100%', maxWidth: 320 },
  secondaryBtns: { display: 'flex', gap: 10, width: '100%', maxWidth: 320 },
  secBtn: { flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 6px', fontSize: 13, cursor: 'pointer' },
};
