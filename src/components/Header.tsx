import React from 'react';
import type { Theme, SeasonalTheme } from "../types";
import { SunIcon, MoonIcon, SearchIcon, MenuIcon, SantaSleighIcon } from "./Icons";
import { motion } from 'framer-motion';
import { useSeason } from "../contexts/SeasonalContext";
import { useRouter } from '../contexts/RouterContext';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onMenuClick: () => void;
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
}

const themeIconMap: Record<SeasonalTheme, { icon: string, animation: string }> = {
  none: { icon: '📄', animation: 'animation-none' },
  winter: { icon: '❄️', animation: 'animate-[icon-snowflake-drift_4s_ease-in-out_infinite]' },
  autumn: { icon: '🍂', animation: 'animate-[icon-leaf-sway_3s_ease-in-out_infinite]' },
  spring: { icon: '🌸', animation: 'animate-[icon-bloom_4s_ease-in-out_infinite]' },
  summer: { icon: '☀️', animation: 'animate-[icon-sun-rotate_8s_linear_infinite]' },
  monsoon: { icon: '🌧️', animation: 'animate-[icon-rain-drip_2s_ease-in-out_infinite]' },
  diwali: { icon: '🪔', animation: 'animate-[icon-flame-flicker_2s_ease-in-out_infinite]' },
  holi: { icon: '🎨', animation: 'animate-[icon-color-splash_3s_ease-in-out_infinite]' },
  pongal: { icon: '🏺', animation: 'animate-[icon-pulse_2s_ease-in-out_infinite]' },
  navratri: { icon: '💃', animation: 'animate-[icon-dance-pulse_3s_ease-in-out_infinite]' },
  christmas: { icon: '🌟', animation: 'animate-[icon-star-twinkle_3s_ease-in-out_infinite]' },
  new_year: { icon: '🎉', animation: 'animate-[icon-firework-burst_2s_ease-in-out_infinite]' },
  independence_day_in: { icon: '🇮🇳', animation: 'animate-[icon-flag-wave_2s_ease-in-out_infinite]' },
};

const ThemeIcon: React.FC = () => {
  const { theme, colors } = useSeason();
  const { icon, animation } = themeIconMap[theme] || themeIconMap.none;

  if (theme === 'christmas') {
    return (
      <motion.div
        key="christmas"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="inline-block"
      >
        <SantaSleighIcon className={`h-10 w-24 ${colors.primaryText}`} />
      </motion.div>
    );
  }

  return (
    <motion.span
      key={theme}
      initial={{ scale: 0, opacity: 0, rotate: -90 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={`text-2xl inline-block ${animation}`}
    >
      {icon}
    </motion.span>
  );
};


const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, searchTerm, setSearchTerm, onMenuClick, isSearchVisible, setIsSearchVisible }) => {
  const { colors, theme: seasonalTheme } = useSeason();
  const { pushPath } = useRouter();
  const isIndependenceDay = seasonalTheme === 'independence_day_in';

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`flex-shrink-0 backdrop-blur-sm border-b p-4 flex items-center justify-between shadow-sm sticky top-0 z-20 ${colors.bgOpacity80} ${colors.border}`}>
      
      {!isSearchVisible ? (
        <>
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => pushPath('/')}>
            <button onClick={(e) => { e.stopPropagation(); onMenuClick(); }} className={`p-2 rounded-full md:hidden ${colors.hover}`}>
              <MenuIcon className="h-6 w-6" />
            </button>
            <ThemeIcon />
            <div className="flex flex-col">
              <h1 className={`text-lg md:text-2xl font-serif font-bold leading-tight ${colors.primaryText}`}>
                Notenirman
              </h1>
              {isIndependenceDay && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-[10px] font-semibold opacity-80"
                >
                  India 🇮🇳
                </motion.p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsSearchVisible(true)}
              className={`p-2 rounded-full sm:hidden ${colors.hover}`}
              aria-label="Open search"
            >
              <SearchIcon className={`h-6 w-6 ${colors.primaryText}`} />
            </button>
            
            <div id="tour-search-bar" className="relative hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className={`h-5 w-5 ${colors.secondaryText}`} />
              </span>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-48 md:w-64 pl-10 pr-4 py-2 rounded-full border focus:ring-2 focus:ring-accent focus:outline-none transition-all duration-300 dark:shadow-neumorphic-inset text-sm text-left ${colors.surface} ${colors.border} ${colors.primaryText}`}
              />
            </div>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${colors.hover} transition-colors duration-200`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ?
                <MoonIcon className={`h-6 w-6 ${colors.primaryText}`} /> :
                <SunIcon className="h-6 w-6 text-accent" />
              }
            </button>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className={`h-5 w-5 ${colors.secondaryText}`} />
            </span>
            <input
              autoFocus
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-full border focus:ring-2 focus:ring-accent focus:outline-none transition-all duration-300 text-sm text-left ${colors.surface} ${colors.border} ${colors.primaryText}`}
            />
          </div>
          <button 
            onClick={() => setIsSearchVisible(false)}
            className={`px-3 py-2 text-sm font-medium ${colors.primaryText}`}
          >
            Cancel
          </button>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
