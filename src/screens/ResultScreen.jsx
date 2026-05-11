import { useGameStore } from '../store/gameStore';

export default function ResultScreen({ result, score, purity, stars, onNext, onRetry, onHome }) {
  const { currentLevel } = useGameStore();
  const won = result === 'win';

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.emoji}>{won ? '🎉' : '😔'}</div>
        <h2 style={{ ...styles.title, color: won ? '#4fc3f7' : '#ff6b6b' }}>
          {won ? 'Level Complete!' : 'Try Again!'}
        </h2>
        <p style={styles.level}>Level {currentLevel}</p>

        <div style={styles.starsRow}>
          {[1, 2, 3].map(s => (
            <span key={s} style={{ fontSize: 32, opacity: s <= stars ? 1 : 0.25 }}>⭐</span>
          ))}
        </div>

        <div style={styles.stats}>
          <div style={styles.statRow}><span>🏆 Score</span><span style={styles.statVal}>{score.toLocaleString()}</span></div>
          <div style={styles.statRow}><span>💧 Purity</span><span style={styles.statVal}>{purity}%</span></div>
        </div>

        <div style={styles.actions}>
          {won && <button style={styles.primaryBtn} onClick={onNext}>Next Level ▶</button>}
          <button style={won ? styles.secBtn : styles.primaryBtn} onClick={onRetry}>🔄 Retry</button>
          <button style={styles.secBtn} onClick={onHome}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628,#1a3a5c)', padding: 24 },
  card: { background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', color: 'white' },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 28, margin: '0 0 4px' },
  level: { color: '#aaa', fontSize: 14, marginBottom: 16 },
  starsRow: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stats: { background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  statVal: { fontWeight: 'bold', color: '#4fc3f7' },
  actions: { display: 'flex', flexDirection: 'column', gap: 10 },
  primaryBtn: { background: '#4fc3f7', color: '#0a1628', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' },
  secBtn: { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px', fontSize: 15, cursor: 'pointer' },
};
