import { useGameStore } from '../store/gameStore';
import { CUP_SKINS } from '../game/constants';

export default function SkinsScreen({ onBack }) {
  const { selectedCupSkin, selectCupSkin, highestLevel } = useGameStore();

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← Back</button>
      <h2 style={styles.title}>🎨 Cup Skins</h2>
      <p style={{ color: '#aaa', textAlign: 'center', marginBottom: 24 }}>Unlock skins by reaching new levels</p>

      <div style={styles.grid}>
        {CUP_SKINS.map(skin => {
          const unlocked = highestLevel >= skin.unlockLevel;
          const selected = selectedCupSkin === skin.id;
          return (
            <div
              key={skin.id}
              style={{ ...styles.card, opacity: unlocked ? 1 : 0.4, border: selected ? '2px solid #4fc3f7' : '2px solid transparent', cursor: unlocked ? 'pointer' : 'default' }}
              onClick={() => unlocked && selectCupSkin(skin.id)}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 28,
                background: skin.color === 'rainbow'
                  ? 'linear-gradient(135deg,red,orange,yellow,green,blue,purple)'
                  : skin.color,
                margin: '0 auto 8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>🥤</div>
              <p style={styles.skinName}>{skin.label}</p>
              <p style={styles.skinUnlock}>{unlocked ? (selected ? '✅ Selected' : 'Tap to select') : `🔒 Level ${skin.unlockLevel}`}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(180deg,#0a1628,#1a3a5c)', padding: 24, color: 'white' },
  back: { background: 'transparent', border: 'none', color: '#4fc3f7', fontSize: 16, cursor: 'pointer', marginBottom: 16 },
  title: { textAlign: 'center', fontSize: 28, marginBottom: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 380, margin: '0 auto' },
  card: { background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, textAlign: 'center' },
  skinName: { fontWeight: 'bold', marginBottom: 4 },
  skinUnlock: { fontSize: 12, color: '#aaa', margin: 0 },
};
