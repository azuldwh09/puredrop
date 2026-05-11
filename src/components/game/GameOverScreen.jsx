import { motion } from 'framer-motion';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CupUnlockModal from './CupUnlockModal';
import { CUP_SKINS } from '@/lib/cupSkins';
import { computeStars } from '@/hooks/usePlayerProfile';

export default function GameOverScreen({ score, win, purity, fill, level, scoreBreakdown, onRestart, onSkinApply, previousHighestLevel }) {
  // Only show unlock modal if:
  // 1. Player just won
  // 2. A skin unlocks at exactly this level
  // 3. This level was NOT previously reached (it's a genuine first-time unlock)
  const newlyUnlocked = win && previousHighestLevel != null && previousHighestLevel < level
    ? Object.values(CUP_SKINS).find(s => s.requireLevel === level)
    : null;

  const [showUnlock, setShowUnlock] = useState(!!newlyUnlocked);

  const handleApply = () => {
    if (onSkinApply && newlyUnlocked) onSkinApply(newlyUnlocked.id);
    setShowUnlock(false);
  };
  const fillGoal = 100;
  const almostWon = !win && fill >= fillGoal * 0.7;

  const catchPct = scoreBreakdown
    ? Math.round(scoreBreakdown.catchRate * 100)
    : null;

  const stars = scoreBreakdown
    ? computeStars(scoreBreakdown.finalScore ?? score, scoreBreakdown.catchRate, win)
    : 0;

  const accuracyColor = catchPct === null ? ''
    : catchPct === 100 ? '#4ee8a8'
    : catchPct >= 90 ? '#a8e84e'
    : catchPct >= 70 ? '#e8a84e'
    : '#ff6b6b';

  return (
    <div className="fixed inset-0 overflow-y-auto bg-background z-10">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center w-full max-w-sm mx-auto px-4 text-center py-8 pb-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-8xl mb-4"
      >
        {win ? '🏆' : almostWon ? '😅' : '😢'}
      </motion.div>

      {/* Star rating */}
      {win && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 220 }}
          className="flex gap-2 mb-4"
        >
          {[1, 2, 3].map(s => (
            <motion.span
              key={s}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.45 + s * 0.12, type: 'spring', stiffness: 300 }}
              style={{
                fontSize: 38,
                filter: stars >= s ? 'drop-shadow(0 0 8px #fbbf24)' : 'grayscale(1) opacity(0.25)',
                color: '#fbbf24',
              }}
            >
              ★
            </motion.span>
          ))}
        </motion.div>
      )}

      <h2 className="font-pixel text-xl md:text-2xl mb-2" style={{
        color: win ? 'hsl(43 96% 56%)' : 'hsl(0 84% 60%)'
      }}>
        {win ? 'You Win!' : 'Time\'s Up!'}
      </h2>

      <p className="text-muted-foreground text-sm mb-6">
        {win
          ? 'Your cup is filled with pure water! 💧'
          : almostWon
          ? 'So close! Your cup wasn\'t pure enough in time.'
          : 'Better luck next time. Watch out for those cats! 🐱'}
      </p>

      {/* Main stats */}
      <div className="bg-card/60 border border-border/50 rounded-xl p-5 mb-4 w-full max-w-xs space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Level</span>
          <span className="font-pixel text-sm">{level}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Cup Fill</span>
          <span className="font-pixel text-sm">{Math.round((fill / fillGoal) * 100)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Purity</span>
          <span className="font-pixel text-sm" style={{
            color: purity >= 70 ? '#4ee8a8' : purity >= 40 ? '#e8a84e' : '#ff6b6b'
          }}>
            {purity}%
          </span>
        </div>
        {scoreBreakdown && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Drop Accuracy</span>
            <span className="font-pixel text-sm" style={{ color: accuracyColor }}>
              {scoreBreakdown.caught}/{scoreBreakdown.spawned} ({catchPct}%)
            </span>
          </div>
        )}
      </div>

      {/* Score breakdown */}
      <div className="bg-card/60 border border-border/50 rounded-xl p-5 mb-6 w-full max-w-xs space-y-3">
        <p className="font-pixel text-xs text-muted-foreground mb-1 text-left">Score Breakdown</p>

        {scoreBreakdown ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Base Score</span>
              <span className="font-pixel text-sm">+{scoreBreakdown.baseScore}</span>
            </div>
            {win && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Time Bonus</span>
                <span className="font-pixel text-sm text-primary">+{scoreBreakdown.timeBonus}</span>
              </div>
            )}
            {win && scoreBreakdown.accuracyBonus > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Accuracy Bonus</span>
                <span className="font-pixel text-sm" style={{ color: '#4ee8a8' }}>+{scoreBreakdown.accuracyBonus}</span>
              </div>
            )}
            {win && scoreBreakdown.accuracyBonus === 0 && (
              <div className="flex justify-between items-center opacity-50">
                <span className="text-muted-foreground text-sm">Accuracy Bonus</span>
                <span className="font-pixel text-xs text-muted-foreground">Catch 90%+ drops</span>
              </div>
            )}
            <div className="border-t border-border/50 pt-2 flex justify-between items-center">
              <span className="text-muted-foreground text-sm font-semibold">Total</span>
              <span className="font-pixel text-primary text-lg">{scoreBreakdown.finalScore ?? score}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Final Score</span>
            <span className="font-pixel text-primary text-lg">{score}</span>
          </div>
        )}
      </div>

      {!win && purity < 70 && fill >= fillGoal && (
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          💡 Tip: Spill your cup when purity drops below 50% to reset it — but it costs 8 seconds!
        </p>
      )}

      <Button
        onClick={onRestart}
        size="lg"
        aria-label={win ? 'Proceed to next level' : 'Try this level again'}
        className="font-pixel text-sm px-8 py-6 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
        {win ? 'Next Level →' : 'Try Again'}
      </Button>

      {showUnlock && (
        <CupUnlockModal
          skin={newlyUnlocked}
          onApply={handleApply}
          onDismiss={() => setShowUnlock(false)}
        />
      )}
    </motion.div>
    </div>
  );
}