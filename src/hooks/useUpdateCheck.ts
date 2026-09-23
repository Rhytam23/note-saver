import { useEffect, useState } from 'react';
import { detectPlatform } from '../services/platform/platformAdapterFactory';

const VERSION_MANIFEST_URL = 'https://notenirman.vercel.app/downloads/version.json';
const DISMISSED_KEY_PREFIX = 'notenirman-update-dismissed-';

interface VersionManifest {
  version: string;
  windows: string;
  android: string;
}

export interface UpdateInfo {
  latestVersion: string;
  downloadUrl: string;
}

/**
 * Compares two "x.y.z" version strings. Returns true if `a` is strictly
 * newer than `b`. Deliberately simple (no pre-release/build-metadata
 * handling) since release tags in this repo are always plain x.y.z.
 */
function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * The Microsoft Store updates its own apps, and its policy does not allow an app to offer its
 * own installer download, so the Store build never shows the update banner.
 */
async function isStorePackage(): Promise<boolean> {
  if (detectPlatform() !== 'tauri') return false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('is_store_package');
  } catch {
    return false;
  }
}

async function getCurrentAppVersion(): Promise<string | null> {
  const platform = detectPlatform();
  try {
    if (platform === 'tauri') {
      const { getVersion } = await import('@tauri-apps/api/app');
      return await getVersion();
    }
    if (platform === 'capacitor') {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      return info.version;
    }
  } catch (error) {
    console.warn('[useUpdateCheck] Failed to read current app version:', error);
  }
  return null;
}

/**
 * Checks once on mount whether a newer build than the one currently
 * installed has been published, for the installed desktop and Android
 * apps only (the web app is always the latest version, since every push
 * to main redeploys it - there's nothing to "update" there).
 *
 * This never auto-downloads or auto-installs anything - it only surfaces
 * that an update exists and where to get it; the user decides whether and
 * when to act on it. See docs/DECISIONS.md for why (Windows exe/msi and
 * the sideloaded Android APK have no built-in updater, and a silent swap
 * of app binaries without consent isn't something this app does).
 *
 * A user can dismiss a specific version's notice (per device, via
 * localStorage) without it reappearing until the *next* version ships.
 */
export function useUpdateCheck(): { info: UpdateInfo | null; dismiss: () => void } {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const platform = detectPlatform();
    if (platform === 'web') return;

    let cancelled = false;

    (async () => {
      if (await isStorePackage()) return;
      if (cancelled) return;
      const currentVersion = await getCurrentAppVersion();
      if (!currentVersion || cancelled) return;

      let manifest: VersionManifest;
      try {
        const res = await fetch(VERSION_MANIFEST_URL, { cache: 'no-store' });
        if (!res.ok) return;
        manifest = await res.json();
      } catch {
        // Offline, or the site is briefly unreachable - fail silently,
        // this is a background nicety, not something to bother the user
        // (or the console) about.
        return;
      }
      if (cancelled || !manifest?.version || !isNewer(manifest.version, currentVersion)) return;

      try {
        if (localStorage.getItem(DISMISSED_KEY_PREFIX + manifest.version) === '1') return;
      } catch {
        // Ignore storage errors (private browsing, etc.) - just show the banner.
      }

      const downloadUrl = platform === 'capacitor' ? manifest.android : manifest.windows;
      setInfo({ latestVersion: manifest.version, downloadUrl: `https://notenirman.vercel.app${downloadUrl}` });
    })();

    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    if (info) {
      try {
        localStorage.setItem(DISMISSED_KEY_PREFIX + info.latestVersion, '1');
      } catch {
        // Non-fatal - worst case the banner reappears next launch.
      }
    }
    setInfo(null);
  };

  return { info, dismiss };
}
