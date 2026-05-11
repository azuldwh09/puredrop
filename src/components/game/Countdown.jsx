import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Countdown({ onDone }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) { onDone(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl z-20" style={{ pointerEvents: 'all', touchAction: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="font-pixel text-primary text-center text-sm leading-relaxed mb-8 px-6 drop-shadow-lg"
      >
        Catch the Drops<br />of Water!!!
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="font-pixel text-white text-center"
        >
          {count > 0 ? (
            <span className="text-8xl text-primary drop-shadow-lg">{count}</span>
          ) : (
            <span className="text-4xl text-accent">GO!</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>

  );
}