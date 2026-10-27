import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getDynamicTheme, getThemeFromCalendarEvents } from "../services/seasonalService";
import { getUserLocation } from "../services/locationService";
import { fetchTodayEvents } from "../services/calendarService";
import { getThemeColors } from "../services/themeColorService";
import { useAuth } from "./AuthContext";
import { useTheme } from "./ThemeContext";
import { getNavratriStyle, getUserRegion, type NavratriStyle } from "../services/navratriStyle";

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
  setSeasonalTheme: (theme: SeasonalTheme) => void;
  /** Regional way of celebrating Navratri; only meaningful when theme is 'navratri'. */
  navratriStyle: NavratriStyle;
}

const SeasonalContext = createContext<SeasonalContextType | undefined>(undefined);

export const SeasonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const { theme: colorMode } = useTheme() as any;
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalTheme>('autumn');
  const [navratriStyle, setNavratriStyle] = useState<NavratriStyle>('garba');

  useEffect(() => {
    if (seasonalTheme !== 'navratri') return;
    let cancelled = false;
    getUserRegion().then((region) => {
      if (!cancelled) setNavratriStyle(getNavratriStyle(region));
    });
    return () => { cancelled = true; };
  }, [seasonalTheme]);

  const colors = useMemo(() => {
    const isDarkMode = colorMode === 'dark';
    return getThemeColors(seasonalTheme, isDarkMode);
  }, [seasonalTheme, colorMode]);

  useEffect(() => {
    const determineTheme = async () => {
      if (user?.themePreference && user.themePreference !== 'auto') {
        setSeasonalTheme(user.themePreference);
        return;
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const stored = window.localStorage.getItem('notenirman_seasonal_theme') as SeasonalTheme | null;
          if (stored && stored !== 'auto' as any) {
            setSeasonalTheme(stored);
            return;
          }
        } catch {
          // Ignore storage errors
        }
      }

      try {
        const eventTitles = await fetchTodayEvents();
        if (eventTitles.length > 0) {
          const calendarTheme = getThemeFromCalendarEvents(eventTitles);
          if (calendarTheme) {
            setSeasonalTheme(calendarTheme);
            return;
          }
        }

        const location = await getUserLocation();
        const dynamicTheme = getDynamicTheme(location);
        setSeasonalTheme(dynamicTheme);
      } catch (error) {
        console.error("Failed to determine dynamic theme:", error);
        setSeasonalTheme(getDynamicTheme({ country: 'US', latitude: 39.8283 }));
      }
    };

    determineTheme();

    const interval = setInterval(() => {
      if (!user?.themePreference || user.themePreference === 'auto') {
        determineTheme();
      }
    }, 1000 * 60 * 60 * 24);

    return () => clearInterval(interval);

  }, [user?.themePreference]);

  const handleSetSeasonalTheme = (theme: SeasonalTheme) => {
    setSeasonalTheme(theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('notenirman_seasonal_theme', theme);
      } catch {
        // Ignore storage errors
      }
    }
  };

  return (
    <SeasonalContext.Provider value={{ theme: seasonalTheme, colors, setSeasonalTheme: handleSetSeasonalTheme, navratriStyle }}>
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
