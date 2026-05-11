import { motion } from 'framer-motion';
import { Droplets, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StartScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-7xl mb-4"
      >
        🌧️
      </motion.div>

      <h1 className="font-pixel text-2xl md:text-3xl text-primary mb-2 leading-relaxed">
        Pure Rain
      </h1>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Catch clean raindrops to fill your cup with pure water. Avoid obstacles and contaminated drops!
      </p>

      <div className="bg-card/60 border border-border/50 rounded-xl p-5 mb-8 text-left max-w-xs w-full space-y-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💧</span>
          <span className="text-muted-foreground">Clean drops — fill your cup & earn points</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">☠️</span>
          <span className="text-muted-foreground">Dirty drops — contaminate your water</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🪨⚽🐱</span>
          <span className="text-muted-foreground">Obstacles — knock and spill your cup! (-8s)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">💦</span>
          <span className="text-muted-foreground">Spill on purpose to purge contamination (-8s)</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2">🎯 Fill to 100% with 70%+ purity to win!</div>
      <div className="text-xs text-muted-foreground mb-6">← → arrows or A/D to move</div>

      <Button
        onClick={onStart}
        size="lg"
        className="font-pixel text-sm px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <Play className="w-4 h-4 mr-2" />
        Start Game
      </Button>
    </motion.div>
  );
}