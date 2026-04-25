import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getDynamicTheme, getThemeFromCalendarEvents } from "../services/seasonalService";
import { getUserLocation } from "../services/locationService";
import { fetchTodayEvents } from "../services/calendarService";
// import type { SeasonalTheme } from "../types";
import { getThemeColors } from "../services/themeColorService";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";

// Inline types to avoid resolution issues
export type SeasonalTheme =
  | 'none' | 'winter' | 'autumn' | 'spring' | 'summer' | 'monsoon'
  | 'diwali' | 'holi' | 'pongal' | 'navratri' | 'christmas'
  | 'new_year' | 'independence_day_in';

export interface ThemeColors {
  primaryText: string;
  secondaryText: string;
  border: string;
  surface: string;
  hover: string;
  bgSimple: string;
  bgOpacity80: string;
  bgOpacity60: string;
}

export interface SeasonalContextType {
  theme: SeasonalTheme;
  colors: ThemeColors;
}

const SeasonalContext = createContext<SeasonalContextType | undefined>(undefined);

export const SeasonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const { theme: colorMode } = useTheme() as any;
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalTheme>('none');

  const colors = useMemo(() => {
    const isDarkMode = colorMode === 'dark';
    return getThemeColors(seasonalTheme, isDarkMode);
  }, [seasonalTheme, colorMode]);

  useEffect(() => {
    const determineTheme = async () => {
      // Prioritize user's manual preference
      if (user?.themePreference && user.themePreference !== 'auto') {
        setSeasonalTheme(user.themePreference);
        return;
      }

      // Fallback to automatic detection
      try {
        // 1. Try Google Calendar events first
        const eventTitles = await fetchTodayEvents();
        if (eventTitles.length > 0) {
          const calendarTheme = getThemeFromCalendarEvents(eventTitles);
          if (calendarTheme) {
            setSeasonalTheme(calendarTheme);
            return;
          }
        }

        // 2. Fallback to location-based seasonal logic
        const location = await getUserLocation();
        const dynamicTheme = getDynamicTheme(location);
        setSeasonalTheme(dynamicTheme);
      } catch (error) {
        console.error("Failed to determine dynamic theme:", error);
        // Fallback to a default if everything fails
        setSeasonalTheme(getDynamicTheme({ country: 'US', latitude: 39.8283 }));
      }
    };

    determineTheme();

    // Optional: Set up an interval to re-check the theme daily if set to auto
    const interval = setInterval(() => {
      if (!user?.themePreference || user.themePreference === 'auto') {
        determineTheme();
      }
    }, 1000 * 60 * 60 * 24); // every 24 hours

    return () => clearInterval(interval);

  }, [user?.themePreference]);


  return (
    <SeasonalContext.Provider value={{ theme: seasonalTheme, colors }}>
      {children}
    </SeasonalContext.Provider>
  );
};

export const useSeason = (): SeasonalContextType => {
  const context = useContext(SeasonalContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonalProvider');
  }
  return context as SeasonalContextType;
};
