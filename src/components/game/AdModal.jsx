import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, X, CheckCircle } from 'lucide-react';

// Detect native Capacitor environment
const isNative = () =>
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() ||
    (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNative));

const AD_UNIT_ID = 'ca-app-pub-2912984715921362/8687061841';

export default function AdModal({ onEarn, onClose }) {
  const [phase, setPhase] = useState('prompt'); // prompt | loading | watching | done | error | unavailable
  const [errorMsg, setErrorMsg] = useState('');

  // Preload the rewarded interstitial ad as soon as modal opens
  useEffect(() => {
    if (!isNative()) return;
    preloadAd();
  }, []);

  const preloadAd = async () => {
    try {
      const { RewardedInterstitialAd } = await import('@capacitor-community/admob');
      await RewardedInterstitialAd.prepareRewardVideoAd({
        adId: AD_UNIT_ID,
        isTesting: false,
      });
    } catch (e) {
      console.log('Ad preload (non-critical):', e?.message);
    }
  };

  const startAd = async () => {
    // --- Native Capacitor path: real AdMob rewarded interstitial ---
    if (isNative()) {
      setPhase('loading');
      try {
        const { RewardedInterstitialAd, AdMob } = await import('@capacitor-community/admob');

        // Initialize AdMob if not already done
        await AdMob.initialize({
          requestTrackingAuthorization: false,
          testingDevices: [],
          initializeForTesting: false,
        }).catch(() => {}); // ignore if already initialized

        // Prepare the ad
        await RewardedInterstitialAd.prepareRewardVideoAd({
          adId: AD_UNIT_ID,
          isTesting: false,
        });

        setPhase('watching');

        // Show and await result
        const result = await RewardedInterstitialAd.showRewardVideoAd();

        if (result?.reward?.amount >= 0) {
          setPhase('done');
        } else {
          setErrorMsg('Ad was dismissed before completing.');
          setPhase('error');
        }
      } catch (err) {
        console.error('AdMob error:', err);
        if (err?.message?.includes('not available') || err?.message?.includes('No fill') || err?.message?.includes('load')) {
          setErrorMsg('No ad available right now. Try again later.');
          setPhase('unavailable');
        } else {
          setErrorMsg(err?.message || 'Something went wrong with the ad.');
          setPhase('error');
        }
      }
      return;
    }

    // --- Web fallback: H5 Ad API ---
    setPhase('watching');
    let adHandled = false;

    if (typeof window.adBreak !== 'function') {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) {
        window.adsbygoogle.push(o);
      };
    }

    if (typeof window.adBreak === 'function') {
      window.adBreak({
        type: 'reward',
        name: 'extra-cup',
        beforeReward: (showAdFn) => { showAdFn(); },
        adDismissed: () => {
          if (!adHandled) { adHandled = true; setPhase('error'); setErrorMsg('Watch the full ad to earn your cup.'); }
        },
        adViewed: () => {
          if (!adHandled) { adHandled = true; setPhase('done'); }
        },
        adBreakDone: (placementInfo) => {
          if (!adHandled && placementInfo?.breakStatus === 'notReady') {
            adHandled = true;
            setPhase('unavailable');
            setErrorMsg('No ad available right now. Try again later.');
          }
        },
      });
    } else {
      // No ad API at all — give cup anyway in dev/test
      setTimeout(() => { if (!adHandled) { adHandled = true; setPhase('done'); } }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-xs w-full text-center"
      >
        {phase === 'prompt' && (
          <>
            <div className="text-5xl mb-4">📺</div>
            <h3 className="font-pixel text-sm text-foreground mb-2">Watch a Short Ad</h3>
            <p className="text-muted-foreground text-xs mb-6">Earn 1 free cup by watching a short ad</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1 text-xs">
                <X className="w-3 h-3 mr-1" /> No thanks
              </Button>
              <Button onClick={startAd} className="flex-1 font-pixel text-xs">
                <Play className="w-3 h-3 mr-1" /> Watch
              </Button>
            </div>
          </>
        )}

        {phase === 'loading' && (
          <>
            <div className="text-5xl mb-4 animate-pulse">📡</div>
            <h3 className="font-pixel text-sm text-foreground mb-2">Loading Ad...</h3>
            <p className="text-muted-foreground text-xs mt-4">Just a moment…</p>
          </>
        )}

        {phase === 'watching' && (
          <>
            <div className="text-5xl mb-4">▶️</div>
            <h3 className="font-pixel text-sm text-foreground mb-2">Ad Playing…</h3>
            <p className="text-muted-foreground text-xs mt-4">Watch the full ad to earn your cup</p>
          </>
        )}

        {phase === 'done' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="text-5xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="font-pixel text-sm text-foreground mb-2">You earned a cup!</h3>
            <p className="text-muted-foreground text-xs mb-6">+1 🥤 added to your collection</p>
            <Button onClick={onEarn} className="w-full font-pixel text-xs">
              <CheckCircle className="w-3 h-3 mr-1" /> Claim Reward
            </Button>
          </>
        )}

        {phase === 'unavailable' && (
          <>
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-pixel text-sm text-foreground mb-2">No Ad Available</h3>
            <p className="text-muted-foreground text-xs mb-6">{errorMsg}</p>
            <Button variant="outline" onClick={onClose} className="w-full text-xs">
              <X className="w-3 h-3 mr-1" /> Close
            </Button>
          </>
        )}

        {phase === 'error' && (
          <>
            <div className="text-5xl mb-4">😔</div>
            <h3 className="font-pixel text-sm text-foreground mb-2">Ad Not Completed</h3>
            <p className="text-muted-foreground text-xs mb-6">{errorMsg || 'Watch the full ad to earn your cup.'}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1 text-xs">
                <X className="w-3 h-3 mr-1" /> Close
              </Button>
              <Button onClick={() => setPhase('prompt')} className="flex-1 font-pixel text-xs">
                Try Again
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
