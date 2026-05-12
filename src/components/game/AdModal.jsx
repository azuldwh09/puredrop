import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, X, CheckCircle } from 'lucide-react';

// Detect native Capacitor environment
const isNative = () =>
  typeof window !== 'undefined' &&
  window.Capacitor?.isNativePlatform?.();

const AD_UNIT_ID = 'ca-app-pub-3940256099942544/5354046379';

export default function AdModal({ onEarn, onClose }) {
  const [phase, setPhase] = useState('prompt'); // prompt | loading | watching | done | error | unavailable
  const [errorMsg, setErrorMsg] = useState('');

  const startAd = async () => {
    // ── Native Capacitor path: real AdMob plugin ──
    if (isNative()) {
      setPhase('loading');
      let rewardedListener = null;
      let dismissedListener = null;
      let failedListener = null;

      try {
        // Import only the AdMob singleton — RewardedInterstitialAd is NOT a separate export
        const { AdMob, RewardInterstitialAdPluginEvents } = await import('@capacitor-community/admob');

        // Initialize (safe to call multiple times)
        await AdMob.initialize({ requestTrackingAuthorization: false }).catch(() => {});

        // Wire up event listeners BEFORE preparing the ad
        let adResolved = false;

        await new Promise(async (resolve, reject) => {
          rewardedListener = await AdMob.addListener(
            RewardInterstitialAdPluginEvents.Rewarded,
            () => {
              adResolved = true;
              setPhase('done');
              resolve();
            }
          );

          dismissedListener = await AdMob.addListener(
            RewardInterstitialAdPluginEvents.Dismissed,
            () => {
              if (!adResolved) {
                setErrorMsg('Watch the full ad to earn your cup.');
                setPhase('error');
              }
              resolve();
            }
          );

          failedListener = await AdMob.addListener(
            RewardInterstitialAdPluginEvents.FailedToLoad,
            (err) => {
              setErrorMsg('No ad available right now. Try again later.');
              setPhase('unavailable');
              reject(err);
            }
          );

          // Prepare (load) the ad
          await AdMob.prepareRewardInterstitialAd({ adId: AD_UNIT_ID, isTesting: false });

          setPhase('watching');

          // Show the ad — it plays fullscreen, listeners fire when done
          await AdMob.showRewardInterstitialAd();
        });

      } catch (err) {
        console.error('AdMob error:', err);
        if (phase !== 'done' && phase !== 'error' && phase !== 'unavailable') {
          setErrorMsg(err?.message || 'Something went wrong with the ad.');
          setPhase('error');
        }
      } finally {
        // Always clean up listeners
        rewardedListener?.remove?.();
        dismissedListener?.remove?.();
        failedListener?.remove?.();
      }
      return;
    }

    // ── Web fallback: H5 Ad API ──
    setPhase('watching');
    let adHandled = false;

    if (typeof window.adBreak !== 'function') {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
    }

    window.adBreak({
      type: 'reward',
      name: 'extra-cup',
      beforeReward: (showAdFn) => { showAdFn(); },
      adDismissed: () => {
        if (!adHandled) { adHandled = true; setErrorMsg('Watch the full ad to earn your cup.'); setPhase('error'); }
      },
      adViewed: () => {
        if (!adHandled) { adHandled = true; setPhase('done'); }
      },
      adBreakDone: (info) => {
        if (!adHandled && info?.breakStatus === 'notReady') {
          adHandled = true;
          setErrorMsg('No ad available right now. Try again later.');
          setPhase('unavailable');
        }
      },
    });
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
            >🎉</motion.div>
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
