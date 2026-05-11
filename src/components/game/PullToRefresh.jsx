import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const THRESHOLD = 64; // px to pull before triggering
const MAX_PULL = 90;

/**
 * PullToRefresh — wraps scrollable content.
 * Only triggers when the inner scroll container is already at the top.
 *
 * Props:
 *   onRefresh  — async function to call when threshold is crossed
 *   children   — the scrollable content
 *   scrollRef  — ref to the scrollable container (to check scrollTop)
 */
export default function PullToRefresh({ onRefresh, children, scrollRef }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const pullingRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    const atTop = !scrollRef?.current || scrollRef.current.scrollTop === 0;
    if (!atTop || refreshing) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, [scrollRef, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pullingRef.current || startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) { setPullDistance(0); return; }
    // Rubberband: exponential decay so it feels native
    const clamped = Math.min(dy * 0.5, MAX_PULL);
    setPullDistance(clamped);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(40); // settle indicator
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isTriggered = pullDistance >= THRESHOLD;

  return (
    <div
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-x' }} // allow vertical pan to propagate to scroll
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullDistance > 4 || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.15 }}
            className="absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none"
            style={{ height: 48 }}
          >
            <div className="flex items-center gap-2 bg-card/90 backdrop-blur border border-border/60 rounded-full px-4 py-1.5 shadow-md mt-2">
              <motion.div
                animate={refreshing ? { rotate: 360 } : { rotate: progress * 270 }}
                transition={refreshing ? { repeat: Infinity, duration: 0.7, ease: 'linear' } : { duration: 0 }}
                className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full"
              />
              <span className="text-xs text-muted-foreground font-pixel" style={{ fontSize: 9 }}>
                {refreshing ? 'Refreshing…' : isTriggered ? 'Release!' : 'Pull to refresh'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content shifted down by pull amount */}
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', stiffness: 400, damping: 40, mass: 0.6 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}