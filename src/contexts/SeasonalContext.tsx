import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getDynamicTheme } from '../services/seasonalService.ts';
import { getUserLocation } from '../services/locationService.ts';
// import type { SeasonalTheme } from '../types.ts';
import { getThemeColors } from '../services/themeColorService.ts';
import { useAuth } from './AuthContext.tsx';
import { useTheme } from './ThemeContext.tsx';

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
