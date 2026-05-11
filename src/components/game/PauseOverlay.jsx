import { motion } from 'framer-motion';
import { Play, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PauseOverlay({ onResume, onExit }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20 rounded-2xl"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="text-6xl">⏸️</div>
        <h2 className="font-pixel text-white text-xl tracking-wide">PAUSED</h2>
        <div className="flex flex-col gap-3 w-48">
          <Button
            onClick={onResume}
            className="font-pixel text-sm gap-2 bg-primary hover:bg-primary/80"
          >
            <Play className="w-4 h-4" /> Resume
          </Button>
          <Button
            onClick={onExit}
            variant="outline"
            className="font-pixel text-sm gap-2 border-destructive/60 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Exit Level
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}