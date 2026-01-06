import type { SeasonalTheme, UserLocation } from '../types.ts';

type Festival = {
    theme: SeasonalTheme;
    isActive: (date: Date) => boolean;
};

// A map of country codes to their respective festivals.
// Date ranges are made more general for demonstration purposes.
const festivalData: Record<string, Festival[]> = {
    IN: [ // India
        { theme: 'pongal', isActive: (d) => d.getMonth() === 0 && d.getDate() >= 14 && d.getDate() <= 17 }, // Jan
        { theme: 'holi', isActive: (d) => d.getMonth() === 2 }, // March
        { theme: 'independence_day_in', isActive: (d) => d.getMonth() === 7 && d.getDate() >= 10 && d.getDate() <= 17 }, // Aug 10-17
        { theme: 'navratri', isActive: (d) => d.getMonth() === 9 && d.getDate() >= 3 && d.getDate() <= 12 }, // Oct 3-12
        { theme: 'diwali', isActive: (d) => d.getMonth() === 10 }, // November
        { theme: 'christmas', isActive: (d) => d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26 }, // Dec
    ],
    // Generic festivals applicable to many countries
    DEFAULT: [
        { theme: 'new_year', isActive: (d) => (d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() <= 1) },

        { theme: 'christmas', isActive: (d) => d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26 },
    ]
};

const getSeasonalTheme = (date: Date, latitude: number, country: string): SeasonalTheme => {
    const month = date.getMonth(); // 0-11

    // Specific seasonal logic for India
    if (country === 'IN') {
        if (month >= 2 && month <= 5) return 'summer';   // Mar - Jun (Summer)
        if (month >= 6 && month <= 9) return 'monsoon';  // Jul - Oct (Monsoon)
        return 'winter';                                 // Nov - Feb (Winter)
    }

    // Standard hemisphere-based logic for other countries
    const isNorthernHemisphere = latitude >= 0;

    if (isNorthernHemisphere) {
        if (month >= 2 && month <= 4) return 'spring';   // Mar-May
        if (month >= 3 && month <= 5) return 'summer';   // Apr-Jun
        if (month >= 8 && month <= 10) return 'autumn'; // Sep-Nov
        return 'winter'; // Dec-Feb
    } else { // Southern Hemisphere
        if (month >= 8 && month <= 10) return 'spring';  // Sep-Nov
        if (month >= 11 || month <= 1) return 'summer'; // Dec-Feb
        if (month >= 2 && month <= 4) return 'autumn';   // Mar-May
        return 'winter'; // Jun-Aug
    }
};

export const getDynamicTheme = (location: UserLocation): SeasonalTheme => {
    const now = new Date();

    // 1. Check for country-specific festivals
    const countryFestivals = festivalData[location.country] || [];
    for (const festival of countryFestivals) {
        if (festival.isActive(now)) {
            return festival.theme;
        }
    }

    // 2. Check for generic/default festivals (if not already matched)
    const defaultFestivals = festivalData.DEFAULT || [];
    for (const festival of defaultFestivals) {
        // Avoid applying default Christmas if a country-specific one already exists (e.g. India)
        const isThemeAlreadyHandled = countryFestivals.some(f => f.theme === festival.theme);
        if (!isThemeAlreadyHandled && festival.isActive(now)) {
            return festival.theme;
        }
    }

    // 3. Fallback to seasonal theme based on location
    return getSeasonalTheme(now, location.latitude, location.country);
};