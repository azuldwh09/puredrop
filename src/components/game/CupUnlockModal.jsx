import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shown on the game-over screen when a win unlocks a new cup skin.
 * Props:
 *   skin     – the CUP_SKINS entry that was just unlocked
 *   onApply  – called when player clicks "Apply Now"
 *   onDismiss– called when player clicks "Maybe Later"
 */
export default function CupUnlockModal({ skin, onApply, onDismiss }) {
  if (!skin) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="cup-unlock-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="bg-card border border-border/60 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-accent/20 border border-accent/40 text-accent text-[10px] font-pixel px-3 py-1 rounded-full mb-4">
            🔓 NEW CUP UNLOCKED
          </div>

          {/* Skin preview */}
          <div
            className="w-20 h-20 mx-auto rounded-2xl mb-3 flex items-center justify-center text-4xl shadow-lg"
            style={{ background: skin.gradient, boxShadow: `0 0 24px ${skin.glowColor}` }}
          >
            {skin.emoji}
          </div>

          <h3 className="font-pixel text-base text-foreground mb-1">{skin.name}</h3>
          <p className="text-muted-foreground text-xs mb-6">
            You've unlocked the <span className="text-foreground font-semibold">{skin.name}</span> cup skin!
            Would you like to equip it now?
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={onApply}
              className="w-full bg-primary text-primary-foreground font-pixel text-xs py-3 rounded-xl active:opacity-80 transition-opacity"
            >
              ✨ Apply Now
            </button>
            <button
              onClick={onDismiss}
              className="w-full bg-secondary text-secondary-foreground font-pixel text-xs py-2.5 rounded-xl active:opacity-70 transition-opacity"
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}