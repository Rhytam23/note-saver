import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUserLocation, getLocationFromTimezone } from '../locationService';
import { getUserRegion } from '../navratriStyle';

describe('Location & Geolocation Privacy Security Suite', () => {
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getUserLocation does not initiate any third-party fetch requests', async () => {
    const loc = await getUserLocation();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(loc).toBeDefined();
    expect(loc.country).toBeDefined();
    expect(typeof loc.latitude).toBe('number');
  });

  it('getUserRegion does not initiate any third-party fetch requests', async () => {
    const region = await getUserRegion();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(region).toBeNull();
  });

  it('detects Indian timezone correctly as country IN without network or GPS', () => {
    const origDateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
      const instance = new origDateTimeFormat(...args);
      return {
        ...instance,
        resolvedOptions: () => ({
          ...instance.resolvedOptions(),
          timeZone: 'Asia/Kolkata',
        }),
      } as any;
    });

    const loc = getLocationFromTimezone();
    expect(loc.country).toBe('IN');
    expect(loc.latitude).toBeCloseTo(20.5937, 2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('detects Southern hemisphere timezone correctly without network or GPS', () => {
    const origDateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
      const instance = new origDateTimeFormat(...args);
      return {
        ...instance,
        resolvedOptions: () => ({
          ...instance.resolvedOptions(),
          timeZone: 'Australia/Sydney',
        }),
      } as any;
    });

    const loc = getLocationFromTimezone();
    expect(loc.latitude).toBeLessThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honors explicitly stored user location preferences', async () => {
    localStorage.setItem(
      'notenirman_user_location',
      JSON.stringify({ country: 'FR', latitude: 48.8566 })
    );

    const loc = await getUserLocation();
    expect(loc.country).toBe('FR');
    expect(loc.latitude).toBe(48.8566);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('honors explicitly stored user region preference for Navratri styling', async () => {
    localStorage.setItem('notenirman_navratri_region', 'West Bengal');

    const region = await getUserRegion();
    expect(region).toBe('West Bengal');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
