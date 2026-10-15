import React from 'react';
import type { Theme, SeasonalTheme } from "../types";
import { SunIcon, MoonIcon, SearchIcon, MenuIcon, SantaSleighIcon } from "./Icons";
import { motion } from 'framer-motion';
import { useSeason } from "../contexts/SeasonalContext";
import { useRouter } from '../contexts/RouterContext';
import type { NavratriStyle } from '../services/navratriStyle';

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

// A pair of crossed, decorated dandiya sticks; drawn rather than an emoji so it
// looks the same on every device.
const DandiyaIcon: React.FC<{ className?: string }> = ({ className }) => {
  const stick = (angle: number) => (
    <g transform={`rotate(${angle} 16 16)`}>
      <rect x="14" y="2" width="4" height="28" rx="2" fill="#F59E0B" stroke="#92400E" strokeWidth="0.8" />
      <rect x="14" y="7" width="4" height="3" fill="#DC2626" />
      <rect x="14" y="22" width="4" height="3" fill="#DC2626" />
      <circle cx="16" cy="3.2" r="2.2" fill="#DC2626" stroke="#92400E" strokeWidth="0.6" />
      <circle cx="16" cy="28.8" r="2.2" fill="#DC2626" stroke="#92400E" strokeWidth="0.6" />
      <circle cx="16" cy="16" r="1.1" fill="#FDE68A" />
    </g>
  );
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Navratri dandiya sticks">
      {stick(-40)}
      {stick(40)}
    </svg>
  );
};

// Durga Puja (East India): a trishul.
const TrishulIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Durga Puja trishul">
    <rect x="15" y="12" width="2" height="19" rx="1" fill="#92400E" />
    <path d="M7 5 C7 13 11 14 16 14 C21 14 25 13 25 5" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 1 L19 10 L16 13 L13 10 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="0.6" />
    <path d="M7 1.5 L9.2 6 L4.8 6 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="0.6" />
    <path d="M25 1.5 L27.2 6 L22.8 6 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="0.6" />
    <rect x="13" y="19" width="6" height="2.4" rx="1" fill="#DC2626" />
  </svg>
);

// Golu (South India): tiers of dolls on steps, with a kalash on top.
const GoluIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Golu steps">
    <rect x="3" y="24" width="26" height="5" rx="1" fill="#F59E0B" stroke="#92400E" strokeWidth="0.7" />
    <rect x="7" y="19" width="18" height="5" rx="1" fill="#DC2626" stroke="#92400E" strokeWidth="0.7" />
    <rect x="11" y="14" width="10" height="5" rx="1" fill="#F59E0B" stroke="#92400E" strokeWidth="0.7" />
    <path d="M13.5 14 C13 9 19 9 18.5 14 Z" fill="#DC2626" stroke="#92400E" strokeWidth="0.7" />
    <circle cx="16" cy="7" r="2" fill="#16A34A" stroke="#92400E" strokeWidth="0.6" />
    <circle cx="7" cy="21.5" r="1.5" fill="#FDE68A" />
    <circle cx="25" cy="21.5" r="1.5" fill="#FDE68A" />
    <circle cx="6" cy="26.5" r="1.5" fill="#FDE68A" />
    <circle cx="26" cy="26.5" r="1.5" fill="#FDE68A" />
  </svg>
);

// Ramlila (North India): bow and arrow.
const RamlilaIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Ramlila bow and arrow">
    <path d="M9 3 C25 8 25 24 9 29" fill="none" stroke="#92400E" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M9 3 L9 29" stroke="#FDE68A" strokeWidth="0.9" />
    <line x1="5" y1="16" x2="27" y2="16" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M30 16 L24 12.5 L24 19.5 Z" fill="#DC2626" stroke="#92400E" strokeWidth="0.6" />
    <path d="M5 16 L2 13.5 M5 16 L2 18.5 M8 16 L5 13.5 M8 16 L5 18.5" stroke="#DC2626" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const NavratriIcon: React.FC<{ style: NavratriStyle; className?: string }> = ({ style, className }) => {
  switch (style) {
    case 'durga_puja': return <TrishulIcon className={className} />;
    case 'golu': return <GoluIcon className={className} />;
    case 'ramlila': return <RamlilaIcon className={className} />;
    default: return <DandiyaIcon className={className} />;
  }
};

const ThemeIcon: React.FC = () => {
  const { theme, colors, navratriStyle } = useSeason();
  const { icon, animation } = themeIconMap[theme] || themeIconMap.none;

  if (theme === 'navratri') {
    return (
      <motion.span
        key={`navratri-${navratriStyle}`}
        initial={{ scale: 0, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className={`inline-block ${animation}`}
      >
        <NavratriIcon style={navratriStyle} className="h-8 w-8" />
      </motion.span>
    );
  }

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
