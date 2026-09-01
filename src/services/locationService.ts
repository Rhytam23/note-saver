import type { UserLocation } from '../types';

export const DEFAULT_LOCATION: UserLocation = { country: 'US', latitude: 39.8283 };

interface IpService {
  url: string;
  parser: (data: any) => UserLocation;
}

const ipServices: IpService[] = [
  {
    url: 'https://ipwho.is/',
    parser: (data: any) => {
      if (!data.success) throw new Error(`ipwhois error: ${data.message}`);
      return { country: data.country_code, latitude: data.latitude };
    },
  },
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
  }
];


const getLocationFallback = async (): Promise<UserLocation> => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta')) {
      return { country: 'IN', latitude: 20.5937 };
    }
  } catch (e) {
  }

  for (const service of ipServices) {
    try {
      const response = await fetch(service.url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Request to ${service.url} failed with status ${response.status}`);
      }
      const data = await response.json();
      return service.parser(data);
    } catch (error) {
    }
  }

  return DEFAULT_LOCATION;
};



export const getUserLocation = async (): Promise<UserLocation> => {
  if (!navigator.geolocation) {
    return getLocationFallback();
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 1000 * 60 * 10,
        enableHighAccuracy: false,
      });
    });

    const fallbackLocation = await getLocationFallback();
    return {
      country: fallbackLocation.country,
      latitude: position.coords.latitude,
    };
  } catch (error: any) {
    return getLocationFallback();
  }
};
