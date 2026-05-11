import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const TUTORIALS = [
  {
    title: 'Welcome to PureDrop! 💧',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">You're a water guardian. Move your cup to catch falling clean drops, fill it up, and keep the water pure to win each level!</p>
        <div className="bg-primary/20 border border-primary/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel text-primary">🏆 Win Condition</p>
          <p className="text-xs text-muted-foreground">Fill your cup to the <strong className="text-foreground">fill goal</strong> AND keep water purity above the <strong className="text-foreground">purity goal</strong> before time runs out.</p>
        </div>
        <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel text-accent">📈 500 Levels</p>
          <p className="text-xs text-muted-foreground">Levels range from gentle <strong className="text-foreground">Drizzle</strong> all the way to <strong className="text-foreground">Apocalypse</strong> — each tier brings faster drops, more obstacles, and tighter purity goals.</p>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel">🥤 Cups = Lives</p>
          <p className="text-xs text-muted-foreground">Each attempt costs 1 cup. You start with 5 cups — they refill over time, or you can watch an ad for a free one. No cups = no play!</p>
        </div>
      </div>
    ),
  },
  {
    title: 'What Falls From the Sky',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Two types of things fall — things you <strong className="text-foreground">want</strong> and things you <strong className="text-foreground">don't</strong>:</p>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-primary/10 border border-primary/40 rounded-lg p-2">
            <span className="text-2xl">💧</span>
            <p className="font-pixel mt-1 text-primary">Clean Drop</p>
            <p className="text-muted-foreground mt-0.5">+10 pts · fills cup · boosts combo</p>
          </div>
          <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-2">
            <span className="text-2xl">☠️</span>
            <p className="font-pixel mt-1 text-destructive">Dirty Drop</p>
            <p className="text-muted-foreground mt-0.5">−5 pts · −15% purity · breaks combo</p>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2">
            <span className="text-2xl">🪨</span>
            <p className="font-pixel mt-1">Rock</p>
            <p className="text-muted-foreground mt-0.5">💥 BONK — spills your cup!</p>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2">
            <span className="text-2xl">🏀</span>
            <p className="font-pixel mt-1">Ball</p>
            <p className="text-muted-foreground mt-0.5">🏀 THWACK — spills your cup!</p>
          </div>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-lg p-2 text-center">
          <span className="text-2xl">🐱</span>
          <p className="font-pixel mt-1 text-xs">Cat</p>
          <p className="text-xs text-muted-foreground mt-0.5">🐱 MEOW — also spills! Sneaky critter.</p>
        </div>
        <div className="bg-destructive/15 border border-destructive/50 rounded-lg p-2 text-center text-xs">
          <p className="text-destructive font-pixel">⚠️ Spill = Lose a Cup (Life)!</p>
          <p className="text-muted-foreground mt-1">Rocks, balls & cats spill your cup — you <strong className="text-foreground">lose 1 cup (life)</strong>, 1000 pts, and 8 seconds. No cups left = no more plays until they refill!</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Purity, Combos & Spilling',
    content: (
      <div className="space-y-3">
        <div className="bg-primary/20 border border-primary/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel text-primary">💎 Water Purity</p>
          <p className="text-xs text-muted-foreground">Shown as a bar in the HUD. Clean drops raise it (+1%), dirty drops drop it (−15%). Each level requires a minimum purity to win — higher tiers demand 80–90% purity!</p>
        </div>
        <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel text-accent">🔥 Combo Multiplier</p>
          <p className="text-xs text-muted-foreground">Catch consecutive clean drops to build your combo (up to ×8). Higher combos multiply your points — and unlock power-up items that fall from the sky!</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
          <p className="text-xs font-pixel text-destructive">💦 Manual Spill</p>
          <p className="text-xs text-muted-foreground">If purity is very low, tap the <strong className="text-foreground">"Spill Cup"</strong> button to reset your water to 100% purity — but it costs you <strong className="text-foreground">8 seconds and 1000 pts</strong>. Use it wisely!</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Power-Ups',
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Build your combo to make power-up items fall. Catch them to activate instantly!</p>
        <div className="space-y-1.5 text-xs">
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">🐢</span>
            <div><p className="font-pixel">Slow Time <span className="text-muted-foreground">(×3 combo)</span></p><p className="text-muted-foreground">Everything falls at half speed for 10s — breathe!</p></div>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">🧲</span>
            <div><p className="font-pixel">Attract <span className="text-muted-foreground">(×4 combo)</span></p><p className="text-muted-foreground">Clean drops magnetically drift toward your cup for 5s.</p></div>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">💥</span>
            <div><p className="font-pixel">Blaster <span className="text-muted-foreground">(×5 combo)</span></p><p className="text-muted-foreground">Instantly destroys all rocks & balls on screen.</p></div>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">🪀</span>
            <div><p className="font-pixel">Cat Toy <span className="text-muted-foreground">(×6 combo)</span></p><p className="text-muted-foreground">Distracts all cats — they exit the screen for 6s.</p></div>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">⚡</span>
            <div><p className="font-pixel">Fast Time <span className="text-muted-foreground">(×7 combo)</span></p><p className="text-muted-foreground">Instantly adds +10 seconds to the clock.</p></div>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-2 flex items-start gap-2">
            <span className="text-lg">🌊</span>
            <div><p className="font-pixel">Downpour <span className="text-muted-foreground">(×8 combo)</span></p><p className="text-muted-foreground">Pure clean rain floods the screen for 8s — no obstacles!</p></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Scoring & Bonuses',
    content: (
      <div className="space-y-3">
        <div className="bg-card/60 border border-border/50 rounded-lg p-3 space-y-2 text-xs">
          <p className="font-pixel text-sm">Points Breakdown</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Clean drop (×1 combo)</span><span className="text-foreground font-pixel">+10 pts</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Clean drop (×8 combo)</span><span className="text-foreground font-pixel">+80 pts</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dirty drop caught</span><span className="text-destructive font-pixel">−5 pts</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Hit by obstacle</span><span className="text-destructive font-pixel">−1000 pts</span></div>
        </div>
        <div className="bg-primary/20 border border-primary/50 rounded-lg p-3 space-y-2 text-xs">
          <p className="font-pixel text-sm text-primary">Win Bonuses</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Time remaining</span><span className="text-primary font-pixel">×5 per sec</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">90%+ catch accuracy</span><span className="text-primary font-pixel">+500–1000 pts</span></div>
        </div>
        <div className="bg-accent/20 border border-accent/50 rounded-lg p-3 space-y-1 text-xs">
          <p className="font-pixel text-accent">🔥 Daily Streak</p>
          <p className="text-muted-foreground">Play every day to build your streak — shown on the level select screen. Don't break the chain!</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Controls & Tips',
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-card/60 border border-border/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-pixel">🖥️ Desktop</p>
            <p className="text-xs text-muted-foreground">← → arrow keys or A / D to move</p>
          </div>
          <div className="bg-card/60 border border-border/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-pixel">📱 Mobile</p>
            <p className="text-xs text-muted-foreground">Tap & drag anywhere to slide the cup</p>
          </div>
        </div>
        <div className="bg-card/60 border border-border/50 rounded-lg p-3 space-y-2 text-xs">
          <p className="font-pixel">⏸️ Pause & Exit</p>
          <p className="text-muted-foreground">Tap the pause button (top-right during play) to pause. Tap X to exit the level entirely.</p>
        </div>
        <div className="space-y-1.5 text-xs">
          <p className="font-pixel text-accent">💡 Pro Tips</p>
          <p className="text-muted-foreground">• Stay near the center — drops can come from anywhere.</p>
          <p className="text-muted-foreground">• Don't panic-spill — losing 8s is often worse than dirty water.</p>
          <p className="text-muted-foreground">• Save power-ups for obstacle-heavy stretches at harder tiers.</p>
          <p className="text-muted-foreground">• Higher tiers need more fill AND higher purity — plan ahead!</p>
        </div>
        <p className="text-xs text-muted-foreground text-center font-pixel mt-2">Good luck, water guardian! 💧</p>
      </div>
    ),
  },
];

export default function TutorialModal({ onClose }) {
  const [page, setPage] = useState(0);
  const tutorial = TUTORIALS[page];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/50 rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-pixel text-primary text-lg">{tutorial.title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 min-h-[200px]">
          {tutorial.content}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-pixel">
            {page + 1} / {TUTORIALS.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.min(TUTORIALS.length - 1, page + 1))}
            disabled={page === TUTORIALS.length - 1}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Close button */}
        {page === TUTORIALS.length - 1 && (
          <Button
            onClick={onClose}
            className="w-full mt-3 font-pixel text-xs bg-primary hover:bg-primary/90"
          >
            Start Playing
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}