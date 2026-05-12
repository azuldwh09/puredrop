import { AdMob, RewardInterstitialAdPluginEvents } from '@capacitor-community/admob';

const APP_ID = 'ca-app-pub-2912984715921362~2822387889';
const NEW_CUP_AD_UNIT = 'ca-app-pub-3940256099942544/5354046379';

// Use Google's official test ad unit in dev to avoid policy violations
const AD_UNIT_ID = import.meta.env.DEV
  ? 'ca-app-pub-3940256099942544/5354046379'
  : NEW_CUP_AD_UNIT;

let initialized = false;

export async function initAdMob() {
  if (initialized) return;
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: import.meta.env.DEV,
    });
    initialized = true;
    console.log('[AdMob] Initialized. App ID:', APP_ID);
  } catch (e) {
    console.warn('[AdMob] Init skipped (browser/dev):', e.message);
  }
}

/**
 * Show a rewarded interstitial ad to earn a new cup.
 * Returns true if the user completed the ad and earned the reward.
 */
export async function showNewCupAd() {
  try {
    await AdMob.prepareRewardedInterstitialAd({
      adId: AD_UNIT_ID,
      isTesting: import.meta.env.DEV,
    });

    return new Promise((resolve) => {
      const listeners = [];

      const cleanup = () => listeners.forEach(l => l.remove());

      AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, () => {
        cleanup();
        resolve(true);
      }).then(l => listeners.push(l));

      AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => {
        cleanup();
        resolve(false);
      }).then(l => listeners.push(l));

      AdMob.addListener(RewardInterstitialAdPluginEvents.FailedToShow, () => {
        cleanup();
        resolve(false);
      }).then(l => listeners.push(l));

      AdMob.showRewardedInterstitialAd();
    });
  } catch (e) {
    console.warn('[AdMob] Ad failed:', e.message);
    return false;
  }
}
