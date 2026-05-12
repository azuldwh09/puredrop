import { motion } from 'framer-motion';
import { Lock, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CUP_SKINS } from '@/lib/cupSkins';
import { isDemoMode } from '@/lib/demoMode';

export default function CupCustomizer({ profile, onSelect, onClose }) {
  const highestLevel = profile?.highest_level || 1;
  const selected = profile?.selected_cup_skin || 'classic';
  const isDemo = isDemoMode();

  // NOTE: No motion.div wrapper here -- the parent Game.jsx already wraps this in
  // a motion.div with enter/exit animations controlled by AnimatePresence.
  // Adding a second nested motion.div with its own exit{} blocks the AnimatePresence
  // exit sequence and causes a blank screen when navigating back to the main screen.
  return (
    <div
      className="w-full max-w-sm mx-auto px-4 overflow-y-auto"
      style={{ maxHeight: '100dvh', paddingBottom: '5rem' }}
    >
      <h2 className="font-pixel text-primary text-center text-sm mb-6">Choose Your Cup</h2>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {Object.values(CUP_SKINS).map(skin => {
          const isUnlocked = skin.unlocked || (highestLevel >= (skin.requireLevel || 1));
          const isSelected = selected === skin.id;

          return (
            <motion.button
              key={skin.id}
              whileTap={isUnlocked ? { scale: 0.93 } : {}}
              whileHover={isUnlocked ? { scale: 1.03 } : {}}
              onClick={() => isUnlocked && onSelect(skin.id)}
              disabled={!isUnlocked}
              className={`
                relative rounded-xl border-2 p-0 flex flex-col items-center overflow-hidden transition-all
                ${isSelected ? 'border-white/60 shadow-lg' : 'border-border/40'}
                ${isUnlocked ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
              `}
              style={isSelected ? {
                boxShadow: `0 0 18px 4px ${skin.glowColor || 'rgba(56,189,248,0.4)'}`,
                borderColor: skin.rimColor || 'white',
              } : {}}
            >
              {/* Gradient header band */}
              <div
                className="w-full h-12 flex items-center justify-center relative overflow-hidden"
                style={{ background: skin.gradient || '#1e293b' }}
              >
                <span className="text-3xl drop-shadow-lg z-10">{skin.emoji}</span>
                {/* CSS shimmer -- NOT a framer-motion animation, avoids blocking AnimatePresence exit */}
                {isUnlocked && (
                  <div className="absolute inset-0 skin-shimmer" />
                )}
              </div>

              {/* Info section */}
              <div className="w-full bg-card/80 px-3 py-2 flex flex-col items-center gap-1">
                <span className="font-pixel text-xs text-foreground">{skin.name}</span>

                {!isUnlocked && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span className="text-xs">Lvl {skin.requireLevel}</span>
                  </div>
                )}

                {isUnlocked && !isSelected && (
                  <span className="text-xs text-muted-foreground">Tap to equip</span>
                )}

                {isSelected && (
                  <span className="text-xs font-semibold" style={{ color: skin.rimColor || 'white' }}>
                    Equipped
                  </span>
                )}
              </div>

              {/* Selected badge */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 rounded-full p-0.5"
                  style={{ background: skin.borderColor || 'rgba(56,189,248,0.9)' }}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Button onClick={onClose} className="w-full font-pixel text-xs">
        <ChevronRight className="w-4 h-4 mr-1" /> Back
      </Button>
    </div>
  );
}
