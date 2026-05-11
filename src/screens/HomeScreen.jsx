import { useGameStore } from '../store/gameStore';
import { CUP_SKINS } from '../game/constants';

export default function HomeScreen({ onPlay, onLeaderboard, onSkins }) {
  const { highestLevel, totalScore, streak, cups, selectedCupSkin } = useGameStore();
  const skin = CUP_SKINS.find(s => s.id === selectedCupSkin) || CUP_SKINS[0];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💧 PureDrop</h1>
        <p style={styles.subtitle}>Catch the pure, dodge the contaminated</p>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.stat}><span style={styles.statVal}>⚡ {streak}</span><span style={styles.statLabel}>Streak</span></div>
        <div style={styles.stat}><span style={styles.statVal}>🏆 {highestLevel}</span><span style={styles.statLabel}>Highest Level</span></div>
        <div style={styles.stat}><span style={styles.statVal}>🎯 {totalScore}</span><span style={styles.statLabel}>Total Score</span></div>
      </div>

      <div style={styles.cupPreview}>
        <div style={{ ...styles.cupShape, borderColor: skin.color === 'rainbow' ? 'transparent' : skin.color, background: skin.color === 'rainbow' ? 'linear-gradient(135deg,red,orange,yellow,green,blue,purple)' : `${skin.color}33` }}>
          <span style={{ fontSize: 32 }}>🥤</span>
        </div>
        <p style={{ color: '#aaa', marginTop: 8, fontSize: 14 }}>{skin.label}</p>
      </div>

      <button style={styles.playBtn} onClick={onPlay}>
        ▶ Play — Level {highestLevel}
      </button>

      <div style={styles.secondaryBtns}>
        <button style={styles.secBtn} onClick={onSkins}>🎨 Skins</button>
        <button style={styles.secBtn} onClick={onLeaderboard}>🏅 Leaderboard</button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628 0%,#1a3a5c 100%)', padding: 24, color: 'white' },
  header: { textAlign: 'center', marginBottom: 32 },
  title: { fontSize: 42, margin: 0, letterSpacing: 2 },
  subtitle: { color: '#4fc3f7', fontSize: 16, marginTop: 8 },
  statsRow: { display: 'flex', gap: 24, marginBottom: 32 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 20px' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#aaa', marginTop: 4 },
  cupPreview: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 },
  cupShape: { width: 70, height: 70, borderRadius: 50, border: '3px solid', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  playBtn: { background: '#4fc3f7', color: '#0a1628', border: 'none', borderRadius: 14, padding: '16px 48px', fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16, width: '100%', maxWidth: 320 },
  secondaryBtns: { display: 'flex', gap: 12, width: '100%', maxWidth: 320 },
  secBtn: { flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px', fontSize: 15, cursor: 'pointer' },
};
