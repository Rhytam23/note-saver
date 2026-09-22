export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseUrl: string;
  downloadUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}

// Injected from package.json at build time; the release workflow syncs it from the git tag.
export const CURRENT_APP_VERSION: string = import.meta.env.VITE_APP_VERSION || '0.0.0';

function cleanVersion(ver: string): string {
  return ver.replace(/^v/i, '').trim();
}

function compareSemver(v1: string, v2: string): number {
  const p1 = cleanVersion(v1).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = cleanVersion(v2).split('.').map(n => parseInt(n, 10) || 0);
  
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const response = await fetch('https://api.github.com/repos/Rhytam23/note-saver/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const latestTag = data.tag_name || '';
    
    if (!latestTag) return null;

    const isNewer = compareSemver(latestTag, CURRENT_APP_VERSION) > 0;

    if (!isNewer) {
      return {
        hasUpdate: false,
        latestVersion: cleanVersion(latestTag),
        currentVersion: CURRENT_APP_VERSION,
        releaseUrl: data.html_url || 'https://github.com/Rhytam23/note-saver/releases',
      };
    }

    const isWindows = typeof window !== 'undefined' && navigator.userAgent.includes('Windows');
    const isAndroid = typeof window !== 'undefined' && navigator.userAgent.includes('Android');

    let downloadUrl = data.html_url;
    if (Array.isArray(data.assets)) {
      if (isWindows) {
        const exeAsset = data.assets.find((a: any) => a.name && a.name.endsWith('.exe'));
        if (exeAsset?.browser_download_url) {
          downloadUrl = exeAsset.browser_download_url;
        }
      } else if (isAndroid) {
        const apkAsset = data.assets.find((a: any) => a.name && a.name.endsWith('.apk'));
        if (apkAsset?.browser_download_url) {
          downloadUrl = apkAsset.browser_download_url;
        }
      }
    }

    return {
      hasUpdate: true,
      latestVersion: cleanVersion(latestTag),
      currentVersion: CURRENT_APP_VERSION,
      releaseUrl: data.html_url || 'https://github.com/Rhytam23/note-saver/releases',
      downloadUrl: downloadUrl || data.html_url,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}
