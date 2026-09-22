/**
 * Native OAuth bridge for Tauri desktop and Capacitor Android.
 *
 * The web app's Google sign-in works by navigating the current window to
 * Google, then Supabase redirects it back to this same page - that only
 * works because it's all one browser origin. Inside a Tauri window or an
 * Android WebView there's no "back to this page": navigating the embedded
 * view to Google would strand the user on Google's real website, or on
 * notenirman.vercel.app, with no way back into the app shell.
 *
 * The fix used here (documented, standard for native OAuth):
 *   1. Open the OAuth URL in the device's real system browser, not the
 *      embedded webview - `signInWithOAuth({ skipBrowserRedirect: true })`
 *      gives us that URL instead of auto-navigating.
 *   2. Supabase's redirect target is a custom URL scheme
 *      (notenirman:// on desktop, com.notenirman.app:// on Android,
 *      already declared for Android in AndroidManifest.xml) instead of a
 *      normal https:// page.
 *   3. The OS hands that custom-scheme URL back to the already-running
 *      app instead of opening it as a web page. We catch that event here
 *      and parse the access/refresh tokens out of it.
 *
 * This module is intentionally separate from platformInterfaces.ts /
 * platformAdapterFactory.ts (the filesystem/notification/storage adapter
 * bundle) rather than folded into it - auth is a narrower, one-off
 * concern, and keeping it separate means this can't accidentally regress
 * that already-tested bundle.
 */

import { detectPlatform } from './platformAdapterFactory';

const DESKTOP_SCHEME = 'notenirman';
const DESKTOP_REDIRECT_URL = `${DESKTOP_SCHEME}://auth-callback`;
const ANDROID_REDIRECT_URL = 'com.notenirman.app://auth-callback';

/**
 * The redirect URL to hand Supabase for the current platform. Both values
 * must be added to the Supabase project's Authentication > URL
 * Configuration > Redirect URLs allowlist, or Supabase will refuse the
 * redirect (see docs/SETUP.md).
 */
export function getNativeAuthRedirectUrl(): string {
  return detectPlatform() === 'capacitor' ? ANDROID_REDIRECT_URL : DESKTOP_REDIRECT_URL;
}

/**
 * True on any platform where the native (system-browser + deep-link) flow
 * applies. On web, callers should keep using the existing same-window
 * redirect - that already works and this module does nothing there.
 */
export function isNativeAuthPlatform(): boolean {
  return detectPlatform() !== 'web';
}

/**
 * Open a URL in the device's real system browser (not the embedded
 * webview). Falls back to a plain window.open if neither native API is
 * available, so this never throws on an unexpected platform.
 */
export async function openInSystemBrowser(url: string): Promise<void> {
  const platform = detectPlatform();

  if (platform === 'tauri') {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
    return;
  }

  if (platform === 'capacitor') {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Subscribe to the OAuth callback deep link. The handler receives the full
 * callback URL (e.g. "notenirman://auth-callback#access_token=...") so the
 * caller can parse out whatever Supabase put in it. Returns an unsubscribe
 * function; safe to call on any platform, including web where it's a no-op.
 */
export async function listenForAuthCallback(handler: (url: string) => void): Promise<() => void> {
  const platform = detectPlatform();

  if (platform === 'tauri') {
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
    const unlisten = await onOpenUrl(urls => {
      const url = urls[0];
      if (url) handler(url);
    });
    return unlisten;
  }

  if (platform === 'capacitor') {
    const { App } = await import('@capacitor/app');
    const listener = await App.addListener('appUrlOpen', ({ url }) => {
      if (url) handler(url);
    });
    return () => {
      void listener.remove();
    };
  }

  return () => {};
}
