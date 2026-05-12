/**
 * Native auth for Capacitor (Android/iOS)
 * Uses @capacitor/browser to open Base44 login in an in-app browser.
 * Listens for the redirect back containing access_token in the URL.
 * For logout, just clears the token locally — no server redirect needed.
 */
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const APP_BASE_URL = 'https://app.base44.com';
// The URL Base44 will redirect back to after login.
// Must match what we tell Base44 as `from_url`.
// On native we use a custom scheme so Capacitor can intercept it.
const NATIVE_CALLBACK_URL = 'https://localhost/auth-callback';

export async function nativeLogin() {
  const { Browser } = await import('@capacitor/browser');
  const { App } = await import('@capacitor/app');

  const loginUrl = `${APP_BASE_URL}/login?from_url=${encodeURIComponent(NATIVE_CALLBACK_URL)}&app_id=${appParams.appId}`;

  return new Promise((resolve, reject) => {
    let resolved = false;

    // Listen for the app URL open event — fires when Capacitor intercepts a URL
    // that matches the deep link / custom scheme.
    // With androidScheme: https, Capacitor intercepts https://localhost/* URLs.
    const urlListener = App.addListener('appUrlOpen', async (event) => {
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get('access_token');
        if (token) {
          resolved = true;
          await urlListener.then(l => l.remove()).catch(() => {});
          await Browser.close().catch(() => {});
          base44.auth.setToken(token, true);
          resolve(token);
        }
      } catch (e) {
        console.error('nativeLogin appUrlOpen error:', e);
      }
    });

    // Also poll localStorage — Base44 may write the token there directly
    // if the webview navigates to https://localhost/?access_token=...
    const poll = setInterval(() => {
      const token = localStorage.getItem('base44_access_token') || localStorage.getItem('token');
      if (token && !resolved) {
        resolved = true;
        clearInterval(poll);
        urlListener.then(l => l.remove()).catch(() => {});
        Browser.close().catch(() => {});
        base44.auth.setToken(token, true);
        resolve(token);
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(poll);
        urlListener.then(l => l.remove()).catch(() => {});
        Browser.close().catch(() => {});
        reject(new Error('Login timed out'));
      }
    }, 5 * 60 * 1000);

    Browser.open({ url: loginUrl, presentationStyle: 'popover' }).catch(reject);
  });
}

export function nativeLogout() {
  // Clear token locally — no redirect needed
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
  // Clear the auth header on the axios instance
  base44.auth.setToken('', false);
}
