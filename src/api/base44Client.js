import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// On native Capacitor, relative URLs resolve to https://localhost which goes nowhere.
// We must use the absolute Base44 server URL for all API calls on native.
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const serverUrl = isNative ? 'https://app.base44.com' : '';

export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl,
  requiresAuth: false,
  appBaseUrl: isNative ? 'https://app.base44.com' : appBaseUrl,
  options: {
    onError: () => {},
  },
});
