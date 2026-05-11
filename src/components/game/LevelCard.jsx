import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { getLevelConfig } from '@/lib/levelConfig';

/**
 * A single level card for the carousel.
 * Props: level, isUnlocked, isCurrent, stars (0-3), highScore, onClick
 */
export default function LevelCard({ level, isUnlocked, isCurrent, stars = 0, highScore, onClick }) {
  const cfg = getLevelConfig(level);

  const starColors = ['#fbbf24', '#fbbf24', '#fbbf24'];
  const tierColors = {
    1: { bg: '#0ea5e9', text: '#e0f2fe' },
    2: { bg: '#22c55e', text: '#dcfce7' },
    3: { bg: '#f59e0b', text: '#fef3c7' },
    4: { bg: '#ef4444', text: '#fee2e2' },
    5: { bg: '#a855f7', text: '#f3e8ff' },
    6: { bg: '#ec4899', text: '#fce7f3' },
  };
  const tc = tierColors[cfg.tier] || tierColors[1];

  return (
    <motion.button
      whileTap={isUnlocked ? { scale: 0.93 } : {}}
      onClick={onClick}
      disabled={!isUnlocked}
      className={`
        relative flex flex-col items-center rounded-2xl border-2 transition-all select-none
        ${isCurrent ? 'border-primary shadow-lg shadow-primary/30 bg-primary/10' : ''}
        ${isUnlocked && !isCurrent ? 'border-border/60 bg-card/70 active:border-primary/60' : ''}
        ${!isUnlocked ? 'border-border/20 bg-card/20 opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{ width: 140, minHeight: 160, padding: '14px 10px 10px' }}
    >
      {/* Tier badge */}
      <div
        className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[9px] font-pixel leading-tight"
        style={{ background: tc.bg, color: tc.text }}
      >
        {cfg.label}
      </div>

      {/* Lock or level number */}
      {isUnlocked ? (
        <span className="font-pixel text-2xl text-foreground mt-5 leading-none">{level}</span>
      ) : (
        <div className="mt-5 flex items-center justify-center w-10 h-10 rounded-full bg-border/20">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Stars */}
      <div className="flex gap-0.5 mt-3">
        {[1, 2, 3].map(s => (
          <span
            key={s}
            style={{
              fontSize: 18,
              filter: stars >= s ? 'none' : 'grayscale(1) opacity(0.25)',
              color: starColors[s - 1],
            }}
          >
            ★
          </span>
        ))}
      </div>

      {/* High score */}
      {isUnlocked && highScore != null ? (
        <p className="text-[10px] text-muted-foreground font-pixel mt-1.5 leading-tight">
          {highScore.toLocaleString()} pts
        </p>
      ) : isUnlocked ? (
        <p className="text-[10px] text-muted-foreground mt-1.5">Not played</p>
      ) : null}

      {/* Current level pulse */}
      {isCurrent && (
        <div className="absolute -inset-[2px] rounded-2xl border-2 border-primary animate-pulse pointer-events-none" />
      )}
    </motion.button>
  );
}