import type { SeasonalTheme, UserLocation } from '../types.ts';

type Festival = {
    theme: SeasonalTheme;
    isActive: (date: Date) => boolean;
};

// A map of country codes to their respective festivals.
// Date ranges are made more general for demonstration purposes.
const festivalData: Record<string, Festival[]> = {
    IN: [ // India
        { theme: 'holi', isActive: (d) => d.getMonth() === 2 && d.getDate() <= 15 }, // March 1-15
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

    // Specific seasonal logic for India (approximate ranges)
    if (country === 'IN') {
        const day = date.getDate();

        // Mid-Feb to Mid-Apr: Spring (Vasant)
        if ((month === 1 && day >= 15) || (month === 2) || (month === 3 && day < 15)) {
            return 'spring';
        }

        // Mid-Apr to Mid-Jun: Summer (Grishma)
        if ((month === 3 && day >= 15) || (month === 4) || (month === 5 && day < 15)) {
            return 'summer';
        }

        // Mid-Jun to Mid-Aug: Monsoon (Varsha)
        if ((month === 5 && day >= 15) || (month === 6) || (month === 7 && day < 15)) {
            return 'monsoon';
        }

        // Mid-Aug to Mid-Oct: Autumn (Sharad)
        if ((month === 7 && day >= 15) || (month === 8) || (month === 9 && day < 15)) {
            return 'autumn';
        }

        // Mid-Oct to Mid-Feb: Winter (Hemant/Shishir) - Default fallback
        return 'winter';
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


export const getThemeFromCalendarEvents = (eventTitles: string[]): SeasonalTheme | null => {
    const themeKeywords: Record<string, SeasonalTheme> = {
        'holi': 'holi',
        'diwali': 'diwali',
        'deepavali': 'diwali',
        'christmas': 'christmas',
        'xmas': 'christmas',
        'pongal': 'pongal',
        'navratri': 'navratri',
        'independence day': 'independence_day_in',
        'new year': 'new_year',
        'monsoon': 'monsoon',
        'winter': 'winter',
        'spring': 'spring',
        'summer': 'summer',
        'autumn': 'autumn',
    };

    for (const title of eventTitles) {
        const lowerTitle = title.toLowerCase();
        for (const [keyword, theme] of Object.entries(themeKeywords)) {
            if (lowerTitle.includes(keyword)) {
                return theme;
            }
        }
    }

    return null;
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
