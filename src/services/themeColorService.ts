import type { SeasonalTheme } from "../types";

/**
 * Defines the set of dynamic color classes that change based on the seasonal theme.
 */
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

// Base color schemes for light and dark modes.
// These are used when the theme is 'none' or as a fallback.
const baseLight: ThemeColors = {
    primaryText: 'text-slate-800',
    secondaryText: 'text-slate-500',
    border: 'border-slate-200',
    surface: 'bg-white',
    hover: 'hover:bg-slate-100',
    bgSimple: 'bg-white/60',
    bgOpacity80: 'bg-white/80',
    bgOpacity60: 'bg-white/60',
};

const baseDark: ThemeColors = {
    primaryText: 'text-slate-100',
    secondaryText: 'text-slate-400',
    border: 'border-slate-700',
    surface: 'bg-slate-800',
    hover: 'hover:bg-slate-700',
    bgSimple: 'bg-slate-900/60',
    bgOpacity80: 'bg-slate-900/80',
    bgOpacity60: 'bg-slate-900/60',
};

// A map of seasonal themes to their color overrides.
// Each theme can have different overrides for light and dark modes.
const themes: Record<SeasonalTheme, { light: Partial<ThemeColors>; dark: Partial<ThemeColors> }> = {
    none: { light: {}, dark: {} },
    winter: {
        light: { border: 'border-sky-200', hover: 'hover:bg-sky-50' },
        dark: { border: 'border-sky-800', hover: 'hover:bg-sky-900/50', surface: 'bg-sky-900/50', bgSimple: 'bg-sky-950/60', bgOpacity60: 'bg-sky-950/60', bgOpacity80: 'bg-sky-950/80' }
    },
    autumn: {
        light: { border: 'border-amber-300', hover: 'hover:bg-amber-100' },
        dark: { border: 'border-amber-800', hover: 'hover:bg-amber-900/50', surface: 'bg-orange-950/50', bgSimple: 'bg-orange-950/60', bgOpacity60: 'bg-orange-950/60', bgOpacity80: 'bg-orange-950/80' }
    },
    spring: {
        light: { border: 'border-emerald-200', hover: 'hover:bg-emerald-50' },
        dark: { border: 'border-emerald-800', hover: 'hover:bg-emerald-900/50', surface: 'bg-emerald-950/50', bgSimple: 'bg-emerald-950/60', bgOpacity60: 'bg-emerald-950/60', bgOpacity80: 'bg-emerald-950/80' }
    },
    summer: {
        light: {
            primaryText: 'text-gray-800',
            secondaryText: 'text-teal-600',
            border: 'border-amber-300/60',
            hover: 'hover:bg-white/60',
            surface: 'bg-white/40', // For frosted glass effect
            bgSimple: 'bg-[#fdf3dc]/50', // Sandy beige
            bgOpacity80: 'bg-[#fdf3dc]/70',
            bgOpacity60: 'bg-[#fdf3dc]/50',
        },
        dark: {
            primaryText: 'text-yellow-100',
            secondaryText: 'text-sky-300',
            border: 'border-teal-700/50',
            hover: 'hover:bg-teal-900/50',
            surface: 'bg-teal-950/40', // For frosted glass effect
            bgSimple: 'bg-[#0a1b2f]/50', // Midnight blue
            bgOpacity80: 'bg-[#0a1b2f]/70',
            bgOpacity60: 'bg-[#0a1b2f]/50',
        }
    },
    monsoon: {
        light: { border: 'border-cyan-300/80', hover: 'hover:bg-cyan-100/70', surface: 'bg-cyan-50', bgSimple: 'bg-cyan-50/60', bgOpacity80: 'bg-cyan-50/80', bgOpacity60: 'bg-cyan-50/60' },
        dark: { border: 'border-cyan-800', hover: 'hover:bg-cyan-900/50', surface: 'bg-cyan-950/70', bgSimple: 'bg-cyan-950/60', bgOpacity60: 'bg-cyan-950/60', bgOpacity80: 'bg-cyan-950/80' }
    },
    diwali: {
        light: { border: 'border-amber-400/50', hover: 'hover:bg-amber-100/70', surface: 'bg-amber-50', bgSimple: 'bg-amber-50/60', bgOpacity80: 'bg-amber-50/80', bgOpacity60: 'bg-amber-50/60' },
        dark: { border: 'border-amber-800/80', hover: 'hover:bg-amber-900/50', surface: 'bg-orange-950/70', bgSimple: 'bg-orange-950/60', bgOpacity80: 'bg-orange-950/80', bgOpacity60: 'bg-orange-950/60' }
    },
    holi: {
        light: { border: 'border-pink-200', hover: 'hover:bg-pink-50' },
        dark: { border: 'border-pink-800', hover: 'hover:bg-pink-900/50', surface: 'bg-pink-950/50', bgSimple: 'bg-pink-950/60', bgOpacity60: 'bg-pink-950/60', bgOpacity80: 'bg-pink-950/80' }
    },
    pongal: {
        light: { border: 'border-orange-300', hover: 'hover:bg-orange-100' },
        dark: { border: 'border-orange-800', hover: 'hover:bg-orange-900/50', surface: 'bg-orange-950/50', bgSimple: 'bg-orange-950/60', bgOpacity60: 'bg-orange-950/60', bgOpacity80: 'bg-orange-950/80' }
    },
    navratri: {
        light: {
            primaryText: 'text-rose-900',
            secondaryText: 'text-amber-800',
            border: 'border-amber-300',
            hover: 'hover:bg-amber-100',
            surface: 'bg-[#FFF4E0]',
            bgSimple: 'bg-[#FFF4E0]/60',
            bgOpacity80: 'bg-[#FFF4E0]/80',
            bgOpacity60: 'bg-[#FFF4E0]/60',
        },
        dark: {
            primaryText: 'text-amber-100',
            secondaryText: 'text-rose-300',
            border: 'border-amber-600/50',
            hover: 'hover:bg-amber-500/10',
            surface: 'bg-[#A23B72]/30',
            bgSimple: 'bg-[#A23B72]/60',
            bgOpacity80: 'bg-[#A23B72]/80',
            bgOpacity60: 'bg-[#A23B72]/60',
        }
    },
    christmas: {
        light: {
            primaryText: 'text-red-900',
            secondaryText: 'text-green-800',
            border: 'border-red-200/60',
            hover: 'hover:bg-white/60',
            surface: 'bg-white/40', // Glassmorphism like Summer
            bgSimple: 'bg-red-50/50',
            bgOpacity80: 'bg-white/70',
            bgOpacity60: 'bg-white/50',
        },
        dark: {
            primaryText: 'text-red-100',
            secondaryText: 'text-green-300',
            border: 'border-red-900/50',
            hover: 'hover:bg-red-900/30',
            surface: 'bg-[#0f172a]/40', // Darker glass
            bgSimple: 'bg-[#0f172a]/50', // Dark Slate
            bgOpacity80: 'bg-[#0f172a]/70',
            bgOpacity60: 'bg-[#0f172a]/50',
        }
    },
    new_year: {
        light: {
            primaryText: 'text-slate-900',
            secondaryText: 'text-violet-700',
            border: 'border-yellow-400/50',
            hover: 'hover:bg-yellow-50/60',
            surface: 'bg-white/60',
            bgSimple: 'bg-white/60',
            bgOpacity80: 'bg-white/80',
            bgOpacity60: 'bg-white/60',
        },
        dark: {
            primaryText: 'text-yellow-100', // Gold/Cream text
            secondaryText: 'text-purple-200',
            border: 'border-yellow-500/30', // Subtle gold border
            hover: 'hover:bg-purple-900/40',
            surface: 'bg-[#1e1b4b]/40', // Deep Indigo glass
            bgSimple: 'bg-[#1e1b4b]/60',
            bgOpacity80: 'bg-[#1e1b4b]/80',
            bgOpacity60: 'bg-[#1e1b4b]/60',
        }
    },


    independence_day_in: {
        light: {
            primaryText: 'text-[#000080]',
            secondaryText: 'text-[#138808]',
            border: 'border-orange-200',
            hover: 'hover:bg-green-50/50',
            surface: 'bg-white/80',
            bgSimple: 'bg-white/60',
            bgOpacity80: 'bg-white/80',
            bgOpacity60: 'bg-white/60',
        },
        dark: {
            primaryText: 'text-slate-100',
            secondaryText: 'text-amber-300',
            border: 'border-[#d4af37]/30', // Muted Gold border
            hover: 'hover:bg-green-500/10',
            surface: 'bg-[#000080]/30', // Navy blue surface
            bgSimple: 'bg-[#000080]/60',
            bgOpacity80: 'bg-[#000080]/80',
            bgOpacity60: 'bg-[#000080]/60'
        }
    },
};

/**
 * Returns a set of Tailwind CSS color classes for the given theme and mode.
 * It merges the base colors with any seasonal overrides.
 * @param theme - The current seasonal theme.
 * @param isDarkMode - Whether dark mode is active.
 * @returns An object of Tailwind class strings for dynamic styling.
 */
export function getThemeColors(theme: SeasonalTheme, isDarkMode: boolean): ThemeColors {
    const base = isDarkMode ? baseDark : baseLight;
    const seasonalOverrides = isDarkMode ? themes[theme]?.dark : themes[theme]?.light;
    return { ...base, ...seasonalOverrides };
}
