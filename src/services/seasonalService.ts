import type { SeasonalTheme, UserLocation } from "../types";
import { isLunarFestival } from "./lunarFestivals";

type Festival = {
    theme: SeasonalTheme;
    isActive: (date: Date) => boolean;
};

// Holi, Navratri and Diwali follow the lunar calendar; their dates are
// computed per year in lunarFestivals.ts.
const festivalData: Record<string, Festival[]> = {
    IN: [
        { theme: 'holi', isActive: (d) => isLunarFestival(d, 'holi') },
        { theme: 'navratri', isActive: (d) => isLunarFestival(d, 'navratri') },
        { theme: 'diwali', isActive: (d) => isLunarFestival(d, 'diwali') },
        { theme: 'christmas', isActive: (d) => d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26 },
    ],
    DEFAULT: [
        { theme: 'new_year', isActive: (d) => (d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() <= 1) },

        { theme: 'christmas', isActive: (d) => d.getMonth() === 11 && d.getDate() >= 24 && d.getDate() <= 26 },
    ]
};

const getSeasonalTheme = (date: Date, latitude: number, country: string): SeasonalTheme => {
    const month = date.getMonth();

    if (country === 'IN') {
        const day = date.getDate();

        if ((month === 1 && day >= 15) || (month === 2) || (month === 3 && day < 15)) {
            return 'spring';
        }

        if ((month === 3 && day >= 15) || (month === 4) || (month === 5 && day < 15)) {
            return 'summer';
        }

        if ((month === 5 && day >= 15) || (month === 6) || (month === 7 && day < 15)) {
            return 'monsoon';
        }

        if ((month === 7 && day >= 15) || (month === 8) || (month === 9 && day < 15)) {
            return 'autumn';
        }

        return 'winter';
    }

    const isNorthernHemisphere = latitude >= 0;

    if (isNorthernHemisphere) {
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        if (month >= 8 && month <= 10) return 'autumn';
        return 'winter';
    } else {
        if (month >= 8 && month <= 10) return 'spring';
        if (month >= 11 || month <= 1) return 'summer';
        if (month >= 2 && month <= 4) return 'autumn';
        return 'winter';
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

    const countryFestivals = festivalData[location.country] || [];
    for (const festival of countryFestivals) {
        if (festival.isActive(now)) {
            return festival.theme;
        }
    }

    const defaultFestivals = festivalData.DEFAULT || [];
    for (const festival of defaultFestivals) {
        const isThemeAlreadyHandled = countryFestivals.some(f => f.theme === festival.theme);
        if (!isThemeAlreadyHandled && festival.isActive(now)) {
            return festival.theme;
        }
    }

    return getSeasonalTheme(now, location.latitude, location.country);
};
