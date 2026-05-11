import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getLeaderboard } from '../api/offlineSync';

export default function LeaderboardScreen({ onBack }) {
  const { authToken } = useGameStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(authToken).then(data => {
      setEntries(data || []);
      setLoading(false);
    });
  }, [authToken]);

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← Back</button>
      <h2 style={styles.title}>🏅 Leaderboard</h2>

      {loading ? (
        <p style={{ color: '#aaa' }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#aaa' }}>No scores yet. Be the first!</p>
      ) : (
        <div style={styles.list}>
          {entries.slice(0, 20).map((e, i) => (
            <div key={e.id || i} style={styles.row}>
              <span style={styles.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <div style={styles.info}>
                <span style={styles.name}>{e.display_name || e.user_email?.split('@')[0] || 'Player'}</span>
                <span style={styles.level}>Level {e.level}</span>
              </div>
              <span style={styles.score}>{(e.score || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628,#1a3a5c)', padding: 24, color: 'white' },
  back: { background: 'transparent', border: 'none', color: '#4fc3f7', fontSize: 16, cursor: 'pointer', marginBottom: 16 },
  title: { textAlign: 'center', fontSize: 28, marginBottom: 24 },
  list: { maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 },
  row: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px', gap: 12 },
  rank: { fontSize: 20, minWidth: 36 },
  info: { flex: 1, display: 'flex', flexDirection: 'column' },
  name: { fontWeight: 'bold', fontSize: 15 },
  level: { fontSize: 12, color: '#aaa' },
  score: { fontWeight: 'bold', color: '#4fc3f7', fontSize: 16 },
};
