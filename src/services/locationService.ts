import type { UserLocation } from '../types';

export const DEFAULT_LOCATION: UserLocation = { country: 'US', latitude: 39.8283 };

interface IpService {
  url: string;
  parser: (data: any) => UserLocation;
}

const ipServices: IpService[] = [
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    parser: (data: any) => {
      if (!data.country_code || !data.latitude) throw new Error('Invalid data from get.geojs.io');
      const latitude = parseFloat(data.latitude);
      if (isNaN(latitude)) throw new Error('Invalid latitude from get.geojs.io');
      return { country: data.country_code, latitude };
    },
  },
  {
    url: 'https://ipapi.co/json/',
    parser: (data: any) => {
      if (data.error) throw new Error(`ipapi.co error: ${data.reason}`);
      if (!data.country_code || typeof data.latitude !== 'number') throw new Error('Invalid data from ipapi.co');
      return { country: data.country_code, latitude: data.latitude };
    },
  },
  {
    url: 'https://freegeoip.app/json/',
    parser: (data: any) => {
      if (!data.country_code || typeof data.latitude !== 'number') throw new Error('Invalid data from freegeoip.app');
      return { country: data.country_code, latitude: data.latitude };
    },
  },
  {
    url: 'https://ip-api.com/json',
    parser: (data: any) => {
      if (data.status !== 'success') throw new Error(`ip-api.com error: ${data.message}`);
      if (!data.countryCode || typeof data.lat !== 'number') throw new Error('Invalid data from ip-api.com');
      return { country: data.countryCode, latitude: data.lat };
    },
  },
];


const getLocationFromIp = async (): Promise<UserLocation> => {
  for (const service of ipServices) {
    try {
      const response = await fetch(service.url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Request to ${service.url} failed with status ${response.status}`);
      }
      const data = await response.json();
      const location = service.parser(data);
      return location;
    } catch (error) {
      // Continue to next service
    }
  }

  return DEFAULT_LOCATION;
};


/**
 * Gets the user's location, trying the precise Geolocation API first
 * and falling back to a less precise IP-based lookup.
 */
export const getUserLocation = async (): Promise<UserLocation> => {
  if (!navigator.geolocation) {
    return getLocationFromIp();
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000, // A more responsive 5-second timeout.
        maximumAge: 1000 * 60 * 10, // Allow cached position up to 10 minutes old.
        enableHighAccuracy: false,
      });
    });

    // Geolocation was successful, so we have accurate coordinates.
    // We still need the country code from an IP lookup.
    const ipLocation = await getLocationFromIp();
    return {
      country: ipLocation.country,
      latitude: position.coords.latitude, // Use the more accurate latitude from the browser.
    };
  } catch (error: any) {
    // Fallback to IP-based lookup for both country and latitude.
    return getLocationFromIp();
  }
};
