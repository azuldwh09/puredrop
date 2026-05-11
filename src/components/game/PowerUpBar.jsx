import { motion, AnimatePresence } from 'framer-motion';
import { POWER_UPS } from '@/lib/powerUps';

export default function PowerUpBar({ combo, activePowerUps, onActivate, usedPowerUps }) {
  const available = Object.values(POWER_UPS).filter(p => combo >= p.comboRequired);
  if (available.length === 0) return null;

  return (
    <div className="flex gap-1.5 justify-center flex-wrap">
      <AnimatePresence>
        {available.map(pu => {
          const isActive = activePowerUps[pu.id];
          const isUsed = usedPowerUps[pu.id];
          const timeLeft = isActive ? Math.ceil((isActive - Date.now()) / 1000) : 0;

          return (
            <motion.button
              key={pu.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={!isUsed ? { scale: 0.85 } : {}}
              onClick={() => !isUsed && onActivate(pu.id)}
              disabled={isUsed}
              title={`${pu.label} — ${pu.description}`}
              className={`
                relative flex flex-col items-center justify-center rounded-xl border transition-all
                ${isActive
                  ? 'bg-primary/20 border-primary shadow-lg shadow-primary/30 animate-pulse'
                  : isUsed
                  ? 'bg-card/20 border-border/20 opacity-30 cursor-not-allowed'
                  : 'bg-card/70 border-accent/50 hover:border-accent hover:bg-accent/10 cursor-pointer'}
              `}
              style={{ width: 44, height: 44, minWidth: 44 }}
            >
              <span className="text-lg leading-none">{pu.emoji}</span>
              {isActive && timeLeft > 0 && (
                <span className="absolute -bottom-1 -right-1 font-pixel text-[8px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                  {timeLeft}
                </span>
              )}
              {!isUsed && !isActive && (
                <span className="absolute -top-1 -right-1 font-pixel text-[7px] bg-accent text-accent-foreground rounded-full px-0.5">
                  x{POWER_UPS[pu.id].comboRequired}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}