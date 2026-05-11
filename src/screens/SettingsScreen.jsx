import { useGameStore } from '../store/gameStore';
import { savePlayerProfile } from '../api/offlineSync';

export default function SettingsScreen({ onBack }) {
  const {
    hideFromLeaderboard, setHideFromLeaderboard,
    difficultyTier, authToken, toProfileRecord,
  } = useGameStore();

  const toggleHide = async () => {
    const newVal = !hideFromLeaderboard;
    setHideFromLeaderboard(newVal);
    const profile = toProfileRecord();
    await savePlayerProfile({ ...profile, hide_from_leaderboard: newVal }, authToken);
  };

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← Back</button>
      <h2 style={styles.title}>⚙️ Settings</h2>

      <div style={styles.card}>
        <div style={styles.row}>
          <div>
            <p style={styles.label}>Hide from Leaderboard</p>
            <p style={styles.desc}>Your scores won't appear on the public leaderboard</p>
          </div>
          <button
            style={{ ...styles.toggle, background: hideFromLeaderboard ? '#4fc3f7' : 'rgba(255,255,255,0.15)' }}
            onClick={toggleHide}
          >
            {hideFromLeaderboard ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={styles.row}>
          <div>
            <p style={styles.label}>Current Difficulty</p>
            <p style={styles.desc}>Auto-adjusts as you progress</p>
          </div>
          <span style={styles.badge}>{difficultyTier}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628,#1a3a5c)', padding: 24, color: 'white' },
  back: { background: 'transparent', border: 'none', color: '#4fc3f7', fontSize: 16, cursor: 'pointer', marginBottom: 16 },
  title: { fontSize: 28, marginBottom: 24 },
  card: { background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, maxWidth: 400 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  label: { fontWeight: 'bold', margin: '0 0 4px' },
  desc: { fontSize: 12, color: '#aaa', margin: 0 },
  toggle: { border: 'none', borderRadius: 8, padding: '8px 16px', color: '#0a1628', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 },
  badge: { background: 'rgba(79,195,247,0.2)', color: '#4fc3f7', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 'bold' },
};
