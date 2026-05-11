import { motion, AnimatePresence } from 'framer-motion';

/**
 * Cup-area spill animation anchored near the bottom of the game canvas.
 * The game should be paused externally while this is visible.
 * Props:
 *   visible: boolean
 *   onDone: () => void — called when exit animation completes (~1.8s)
 */
export default function SpillAnimation({ visible, onDone }) {
  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="spill-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          {/* Anchored to the bottom — cup position */}
          <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center">

            {/* Water splash (radiates outward from cup position) */}
            <motion.div
              initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
              animate={{ scaleX: [0, 2.2, 3.0, 2.6], scaleY: [0, 0.5, 1.0, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85, delay: 0.35, ease: 'easeOut' }}
              style={{ originX: 0.5, originY: 1 }}
            >
              <svg viewBox="0 0 120 50" width={120} height={50}>
                <ellipse cx="60" cy="30" rx="50" ry="18" fill="#38bdf8" opacity="0.75" />
                <path d="M60 12 Q28 -8 8 18" stroke="#7dd3fc" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
                <path d="M60 12 Q92 -8 112 18" stroke="#7dd3fc" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
                <path d="M60 12 Q48 -16 38 -2" stroke="#bae6fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
                <path d="M60 12 Q72 -16 82 -2" stroke="#bae6fd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
              </svg>
            </motion.div>

            {/* Tilting cup — sits just above the splash */}
            <motion.div
              initial={{ rotate: 0, y: 0, opacity: 1 }}
              animate={{ rotate: [0, -12, 85, 85], y: [0, -8, 6, 6], opacity: [1, 1, 1, 1] }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              transition={{ duration: 0.6, times: [0, 0.2, 0.55, 1], ease: 'easeInOut' }}
              style={{
                fontSize: 64,
                transformOrigin: 'bottom center',
                filter: 'drop-shadow(0 0 14px #38bdf8)',
                marginTop: -80,
                marginBottom: 4,
              }}
            >
              🥤
            </motion.div>

            {/* Droplets */}
            {[
              { x: -55, y: -80, delay: 0.38 },
              { x: 60, y: -90, delay: 0.42 },
              { x: -85, y: -45, delay: 0.45 },
              { x: 80, y: -40, delay: 0.43 },
              { x: -25, y: -110, delay: 0.40 },
              { x: 30, y: -105, delay: 0.41 },
            ].map((d, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x: d.x, y: d.y, opacity: [0, 1, 0], scale: [0, 1.1, 0] }}
                transition={{ duration: 0.65, delay: d.delay, ease: 'easeOut' }}
                style={{ position: 'absolute', fontSize: 16, bottom: 0, left: '50%', marginLeft: -8 }}
              >
                💧
              </motion.div>
            ))}

            {/* SPILLED! label */}
            <motion.p
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.15, 1.05, 0.9], y: [10, 0, 0, -8] }}
              transition={{ duration: 1.1, delay: 0.4, times: [0, 0.2, 0.7, 1] }}
              className="font-pixel text-white text-base mt-2"
              style={{ textShadow: '0 0 18px #38bdf8, 0 2px 8px rgba(0,0,0,0.9)', letterSpacing: 2 }}
            >
              💦 SPILLED!
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}