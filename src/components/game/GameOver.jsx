import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Droplets, Sparkles, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GameOver({ score, fillLevel, purity, onRestart }) {
  const grade = score >= 80 ? 'S' : score >= 60 ? 'A' : score >= 40 ? 'B' : score >= 20 ? 'C' : 'D';
  const gradeColors = { S: 'text-yellow-300', A: 'text-sky-400', B: 'text-green-400', C: 'text-orange-400', D: 'text-red-400' };
  const messages = {
    S: 'Crystal Clear Champion! 💎',
    A: 'Master Water Catcher! 🌊',
    B: 'Solid Rain Runner! 🌧️',
    C: 'Drizzle Dabbler ☁️',
    D: 'Try Again, Puddle Pal 💦',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-card border border-border rounded-2xl p-8 mx-4 max-w-sm w-full text-center space-y-5"
      >
        <div className="space-y-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`text-7xl font-display ${gradeColors[grade]}`}
          >
            {grade}
          </motion.div>
          <p className="text-muted-foreground font-body text-sm">{messages[grade]}</p>
        </div>

        <div className="flex justify-center gap-6">
          <div className="text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-display text-foreground">{score}</div>
            <div className="text-xs text-muted-foreground font-body">Score</div>
          </div>
          <div className="text-center">
            <Droplets className="w-5 h-5 text-sky-400 mx-auto mb-1" />
            <div className="text-2xl font-display text-foreground">{Math.round(fillLevel)}%</div>
            <div className="text-xs text-muted-foreground font-body">Filled</div>
          </div>
          <div className="text-center">
            <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-2xl font-display text-foreground">{Math.round(purity)}%</div>
            <div className="text-xs text-muted-foreground font-body">Purity</div>
          </div>
        </div>

        <Button onClick={onRestart} className="w-full bg-primary hover:bg-primary/90 font-display text-lg gap-2">
          <RotateCcw className="w-5 h-5" />
          Play Again
        </Button>
      </motion.div>
    </motion.div>
  );
}