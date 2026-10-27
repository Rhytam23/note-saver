import type { UserLocation } from '../types';

export const DEFAULT_LOCATION: UserLocation = { country: 'US', latitude: 39.8283 };

const SOUTHERN_HEMISPHERE_TZ_PREFIXES = [
  'Australia/',
  'Antarctica/',
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Fiji',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Argentina/',
  'America/Santiago',
  'America/Montevideo',
  'America/Lima',
  'America/La_Paz',
  'America/Asuncion',
  'Africa/Johannesburg',
  'Africa/Windhoek',
  'Africa/Maputo',
  'Africa/Gaborone',
  'Africa/Harare',
];

/**
 * Derives user country and hemisphere latitude from local browser timezone and user preferences.
 * Fully private: does not trigger third-party IP geolocation or GPS prompts.
 */
export const getLocationFromTimezone = (): UserLocation => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('notenirman_user_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.country === 'string' && typeof parsed.latitude === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') {
        return { country: 'IN', latitude: 20.5937 };
      }

      const isSouthern = SOUTHERN_HEMISPHERE_TZ_PREFIXES.some(prefix => tz.startsWith(prefix));
      if (isSouthern) {
        return { country: 'SH', latitude: -30.0 };
      }
    }
  } catch {
    // Timezone detection unavailable
  }

  return DEFAULT_LOCATION;
};

/**
 * Resolves user location without external network calls or GPS prompts.
 * Maintains async contract for backwards compatibility with existing consumers.
 */
export const getUserLocation = async (): Promise<UserLocation> => {
  return getLocationFromTimezone();
};
