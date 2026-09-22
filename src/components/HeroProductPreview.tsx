import React, { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { SeasonalTheme } from '../types';
import { useMotionCapability } from '../hooks/useMotionCapability';

export type SeasonalThemeMode = SeasonalTheme;

export interface HeroThemeConfig {
  themeLabel: string;
  windowGlow: string;
  bgTint: string;
  mugText: string;
  journalText: string;
  bookColors: [string, string, string];
  particleIcons: string[];
  accentHex: string;
  accentClass: string;
  badgeBgClass: string;
  badgeBorderClass: string;
  badgeTextClass: string;
  borderGlow: string;
}

export const HERO_THEMES: Record<SeasonalThemeMode, HeroThemeConfig> = {
  autumn: {
    themeLabel: 'Autumn 🍁',
    windowGlow: 'from-amber-600/30 via-orange-600/15 to-transparent',
    bgTint: 'bg-[#1e130e]/90',
    mugText: 'Good Ideas Brighter Days 🍂',
    journalText: 'Small steps Big progress 🍁',
    bookColors: ['#4a2618', '#381c11', '#28130a'],
    particleIcons: ['🍂', '🍁', '🍂', '🍃', '🍁'],
    accentHex: '#f59e0b',
    accentClass: 'text-amber-500 dark:text-amber-400',
    badgeBgClass: 'bg-amber-500/10',
    badgeBorderClass: 'border-amber-500/30',
    badgeTextClass: 'text-amber-600 dark:text-amber-400',
    borderGlow: 'shadow-amber-500/10 border-amber-900/40',
  },
  winter: {
    themeLabel: 'Winter ❄️',
    windowGlow: 'from-sky-500/25 via-blue-600/15 to-transparent',
    bgTint: 'bg-[#0a1526]/90',
    mugText: 'Cozy Mind Fresh Thoughts ❄️',
    journalText: 'Stay clear Stay quiet 🌨️',
    bookColors: ['#12263f', '#0c1b2e', '#07111f'],
    particleIcons: ['❄️', '✨', '❄️', '🌨️', '✨'],
    accentHex: '#38bdf8',
    accentClass: 'text-sky-400 dark:text-sky-300',
    badgeBgClass: 'bg-sky-500/10',
    badgeBorderClass: 'border-sky-500/30',
    badgeTextClass: 'text-sky-600 dark:text-sky-400',
    borderGlow: 'shadow-sky-500/10 border-sky-900/40',
  },
  spring: {
    themeLabel: 'Spring 🌸',
    windowGlow: 'from-emerald-500/25 via-pink-500/15 to-transparent',
    bgTint: 'bg-[#101f14]/90',
    mugText: 'Bloom Where Ideas Grow 🌸',
    journalText: 'New ideas every morning 🌿',
    bookColors: ['#163820', '#0e2716', '#091b0d'],
    particleIcons: ['🌸', '🌱', '🌸', '🍃', '🌱'],
    accentHex: '#10b981',
    accentClass: 'text-emerald-500 dark:text-emerald-400',
    badgeBgClass: 'bg-emerald-500/10',
    badgeBorderClass: 'border-emerald-500/30',
    badgeTextClass: 'text-emerald-600 dark:text-emerald-400',
    borderGlow: 'shadow-emerald-500/10 border-emerald-900/40',
  },
  summer: {
    themeLabel: 'Summer ☀️',
    windowGlow: 'from-amber-400/30 via-yellow-500/15 to-transparent',
    bgTint: 'bg-[#1e220e]/90',
    mugText: 'Bright Days Bold Visions ☀️',
    journalText: 'Energy flows into creation 🌻',
    bookColors: ['#353d12', '#262c0b', '#181d06'],
    particleIcons: ['☀️', '✨', '🍃', '🌻', '✨'],
    accentHex: '#eab308',
    accentClass: 'text-yellow-500 dark:text-yellow-400',
    badgeBgClass: 'bg-yellow-500/10',
    badgeBorderClass: 'border-yellow-500/30',
    badgeTextClass: 'text-yellow-600 dark:text-yellow-400',
    borderGlow: 'shadow-amber-400/10 border-yellow-900/40',
  },
  monsoon: {
    themeLabel: 'Monsoon 🌧️',
    windowGlow: 'from-cyan-500/25 via-teal-600/15 to-transparent',
    bgTint: 'bg-[#0a1c24]/90',
    mugText: 'Raindrops & Deep Thoughts 🌧️',
    journalText: 'Rhythm of rain & ideas 💧',
    bookColors: ['#0d2f3a', '#082129', '#041318'],
    particleIcons: ['🌧️', '💧', '⚡', '💧', '☁️'],
    accentHex: '#06b6d4',
    accentClass: 'text-cyan-400 dark:text-cyan-300',
    badgeBgClass: 'bg-cyan-500/10',
    badgeBorderClass: 'border-cyan-500/30',
    badgeTextClass: 'text-cyan-600 dark:text-cyan-400',
    borderGlow: 'shadow-cyan-500/10 border-cyan-900/40',
  },
  diwali: {
    themeLabel: 'Diwali 🪔',
    windowGlow: 'from-amber-500/35 via-rose-600/20 to-transparent',
    bgTint: 'bg-[#260f1c]/90',
    mugText: 'Light Up Your Ideas 🪔',
    journalText: 'Illuminating knowledge ✨',
    bookColors: ['#4d142d', '#360c1e', '#210612'],
    particleIcons: ['🪔', '✨', '🪔', '🌟', '✨'],
    accentHex: '#f59e0b',
    accentClass: 'text-amber-400 dark:text-amber-300',
    badgeBgClass: 'bg-amber-500/10',
    badgeBorderClass: 'border-amber-500/30',
    badgeTextClass: 'text-amber-500 dark:text-amber-300',
    borderGlow: 'shadow-amber-500/15 border-amber-800/50',
  },
  holi: {
    themeLabel: 'Holi 🎨',
    windowGlow: 'from-pink-500/30 via-purple-500/20 to-transparent',
    bgTint: 'bg-[#240e24]/90',
    mugText: 'Splash of Creativity 🎨',
    journalText: 'Colors of imagination 🌈',
    bookColors: ['#421242', '#2e0b2e', '#1c051c'],
    particleIcons: ['🎨', '🌸', '✨', '💜', '💖'],
    accentHex: '#ec4899',
    accentClass: 'text-pink-400 dark:text-pink-300',
    badgeBgClass: 'bg-pink-500/10',
    badgeBorderClass: 'border-pink-500/30',
    badgeTextClass: 'text-pink-600 dark:text-pink-400',
    borderGlow: 'shadow-pink-500/10 border-pink-900/40',
  },
  pongal: {
    themeLabel: 'Pongal 🌾',
    windowGlow: 'from-orange-500/30 via-amber-500/15 to-transparent',
    bgTint: 'bg-[#24150b]/90',
    mugText: 'Harvest Your Knowledge 🌾',
    journalText: 'Abundance of good thoughts ☀️',
    bookColors: ['#472710', '#301809', '#1d0c04'],
    particleIcons: ['🌾', '☀️', '🍯', '✨', '🌾'],
    accentHex: '#f97316',
    accentClass: 'text-orange-400 dark:text-orange-300',
    badgeBgClass: 'bg-orange-500/10',
    badgeBorderClass: 'border-orange-500/30',
    badgeTextClass: 'text-orange-600 dark:text-orange-400',
    borderGlow: 'shadow-orange-500/10 border-orange-900/40',
  },
  navratri: {
    themeLabel: 'Navratri ✨',
    windowGlow: 'from-rose-500/30 via-amber-500/20 to-transparent',
    bgTint: 'bg-[#240c1a]/90',
    mugText: 'Nine Nights of Creation ✨',
    journalText: 'Vibrant focus & devotions 🌺',
    bookColors: ['#4a1232', '#330a21', '#1f0413'],
    particleIcons: ['✨', '🌺', '🪔', '🌟', '✨'],
    accentHex: '#f43f5e',
    accentClass: 'text-rose-400 dark:text-rose-300',
    badgeBgClass: 'bg-rose-500/10',
    badgeBorderClass: 'border-rose-500/30',
    badgeTextClass: 'text-rose-600 dark:text-rose-400',
    borderGlow: 'shadow-rose-500/10 border-rose-900/40',
  },
  christmas: {
    themeLabel: 'Christmas 🎄',
    windowGlow: 'from-red-500/30 via-emerald-600/20 to-transparent',
    bgTint: 'bg-[#1c0c10]/90',
    mugText: 'Joy to Your Mind 🎄',
    journalText: 'Warmth, peace & ideas 🎁',
    bookColors: ['#471118', '#0e3019', '#24080c'],
    particleIcons: ['🎄', '❄️', '🎁', '✨', '🔔'],
    accentHex: '#ef4444',
    accentClass: 'text-red-400 dark:text-red-300',
    badgeBgClass: 'bg-red-500/10',
    badgeBorderClass: 'border-red-500/30',
    badgeTextClass: 'text-red-600 dark:text-red-400',
    borderGlow: 'shadow-red-500/10 border-red-900/40',
  },
  new_year: {
    themeLabel: 'New Year 🎉',
    windowGlow: 'from-purple-500/30 via-amber-500/20 to-transparent',
    bgTint: 'bg-[#170e2b]/90',
    mugText: 'New Year New Heights 🎉',
    journalText: 'Goals, visions & progress 🥳',
    bookColors: ['#351c5e', '#231042', '#14072b'],
    particleIcons: ['🎉', '✨', '🎆', '🌟', '🥳'],
    accentHex: '#a855f7',
    accentClass: 'text-purple-400 dark:text-purple-300',
    badgeBgClass: 'bg-purple-500/10',
    badgeBorderClass: 'border-purple-500/30',
    badgeTextClass: 'text-purple-600 dark:text-purple-400',
    borderGlow: 'shadow-purple-500/10 border-purple-900/40',
  },
  independence_day_in: {
    themeLabel: 'Independence 🇮🇳',
    windowGlow: 'from-orange-500/25 via-emerald-600/20 to-transparent',
    bgTint: 'bg-[#0b172b]/90',
    mugText: 'Freedom to Think 🇮🇳',
    journalText: 'Pride in creation & wisdom 🪷',
    bookColors: ['#47220b', '#0d3319', '#081730'],
    particleIcons: ['🇮🇳', '✨', '🪷', '🌟', '🕊️'],
    accentHex: '#f97316',
    accentClass: 'text-orange-400 dark:text-orange-300',
    badgeBgClass: 'bg-orange-500/10',
    badgeBorderClass: 'border-orange-500/30',
    badgeTextClass: 'text-orange-600 dark:text-orange-400',
    borderGlow: 'shadow-orange-500/10 border-orange-900/40',
  },
  none: {
    themeLabel: 'Classic 💡',
    windowGlow: 'from-amber-500/20 via-slate-500/10 to-transparent',
    bgTint: 'bg-[#11141c]/90',
    mugText: 'Focused & Pure 💡',
    journalText: 'Clarity in every note 📖',
    bookColors: ['#282f3d', '#1b202a', '#101319'],
    particleIcons: ['💡', '✨', '📄', '🔍', '✨'],
    accentHex: '#f59e0b',
    accentClass: 'text-amber-500 dark:text-amber-400',
    badgeBgClass: 'bg-amber-500/10',
    badgeBorderClass: 'border-amber-500/30',
    badgeTextClass: 'text-amber-600 dark:text-amber-400',
    borderGlow: 'shadow-amber-500/10 border-gray-800',
  },
};

export interface HeroProductPreviewProps {
  activeSeason?: SeasonalThemeMode;
}

export const HeroProductPreview: React.FC<HeroProductPreviewProps> = ({ activeSeason = 'autumn' }) => {
  const currentSeason = HERO_THEMES[activeSeason] || HERO_THEMES.autumn;
  const { tier } = useMotionCapability();

  // Cursor-follow tilt. Hooks are always called (rules-of-hooks); only the
  // DOM listeners below are conditionally attached on tier === 'full', so a
  // 'reduced'/'off' tier pays nothing for a mousemove listener it won't use.
  const perspectiveRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);

  const tiltEnabled =
    tier === 'full' &&
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = perspectiveRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={perspectiveRef}
      className="relative w-full select-none"
      style={{ perspective: 1200 }}
      onMouseMove={tiltEnabled ? handleMouseMove : undefined}
      onMouseLeave={tiltEnabled ? handleMouseLeave : undefined}
    >
      {/* Outer Atmosphere Container with Dynamic Theme Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSeason}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={tiltEnabled ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
          className={`relative rounded-3xl p-3 sm:p-6 overflow-hidden ${currentSeason.bgTint} border border-gray-800 ${currentSeason.borderGlow} shadow-2xl transition-colors duration-500`}
        >
          {/* Background Window Scene Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Window Light Beam */}
            <div className={`absolute -top-20 -right-20 w-[550px] h-[550px] bg-gradient-to-br ${currentSeason.windowGlow} blur-3xl rounded-full opacity-80`} />
            
            {/* Window Frame Panes Visual */}
            <div className="absolute top-0 right-4 sm:right-12 w-64 sm:w-96 h-full opacity-15 border-r-2 border-b-2 border-white/20 pointer-events-none transform -skew-x-12 grid grid-cols-2 grid-rows-3 gap-2 p-2">
              <div className="border border-white/20 rounded-sm" />
              <div className="border border-white/20 rounded-sm" />
              <div className="border border-white/20 rounded-sm" />
              <div className="border border-white/20 rounded-sm" />
            </div>

            {/* Ambient Floating Seasonal Particles */}
            {currentSeason.particleIcons.map((icon, idx) => (
              <motion.div
                key={`${activeSeason}-particle-${idx}`}
                initial={{
                  x: 50 + idx * 75,
                  y: -20,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={{
                  y: [0, 190 + idx * 35],
                  x: [50 + idx * 75, (idx % 2 === 0 ? 30 : 85) + idx * 65],
                  opacity: [0, 0.85, 0],
                  rotate: [0, 180 * (idx % 2 === 0 ? 1 : -1)],
                }}
                transition={{
                  duration: 7 + idx * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 1.1,
                }}
                className="absolute text-sm sm:text-lg opacity-70 pointer-events-none filter drop-shadow"
              >
                {icon}
              </motion.div>
            ))}
          </div>

          {/* Main Laptop Presentation Frame (NoteNirman Product remains constant!) */}
          <div className="relative z-10 mx-auto max-w-4xl">
            {/* Laptop Screen Bezel */}
            <div className="relative rounded-2xl p-1.5 sm:p-2 bg-gradient-to-b from-[#2e2e32] via-[#1e1e22] to-[#121215] border border-gray-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
              {/* Web Cam Dot */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center space-x-1 z-30">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-900 border border-gray-700" />
              </div>

              {/* Laptop Screen Display (Authentic NoteNirman UI) */}
              <div className="relative rounded-xl overflow-hidden bg-[#0d0f17] text-gray-200 border border-gray-800/80 shadow-inner font-sans text-xs sm:text-sm">
                
                {/* Application Top Bar / Search Bar */}
                <div className="flex items-center justify-between px-3 py-2 sm:py-2.5 bg-[#121624] border-b border-gray-800/90 select-none">
                  {/* Left Brand Badge */}
                  <div className="flex items-center space-x-2">
                    <img src="/app-icon.png" alt="NoteNirman Logo" className="w-5 h-5 rounded object-contain" />
                    <span className="font-mono font-bold text-gray-100 text-xs hidden sm:inline-block">
                      NoteNirman
                    </span>
                  </div>

                  {/* Center Search Input Mock */}
                  <div className="flex-1 max-w-sm sm:max-w-md mx-2 sm:mx-6">
                    <div className="flex items-center px-3 py-1 sm:py-1.5 rounded-md bg-[#1a2035] border border-gray-700/50 text-gray-400 text-[11px] sm:text-xs space-x-2 shadow-inner">
                      <span className="text-gray-400">🔍</span>
                      <span className="truncate text-gray-300">Search notes, tags, or ask AI...</span>
                    </div>
                  </div>

                  {/* Right Header Actions */}
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Cloud Synced" />
                    <div
                      className="w-6 h-6 rounded-full border border-opacity-40 flex items-center justify-center font-bold text-[10px]"
                      style={{
                        backgroundColor: `${currentSeason.accentHex}20`,
                        borderColor: `${currentSeason.accentHex}60`,
                        color: currentSeason.accentHex,
                      }}
                    >
                      R
                    </div>
                  </div>
                </div>

                {/* Main Application Workspace Layout Grid */}
                <div className="grid grid-cols-12 min-h-[300px] sm:min-h-[380px] md:min-h-[420px]">
                  
                  {/* Left Sidebar Column */}
                  <div className="hidden sm:block sm:col-span-3 lg:col-span-3 bg-[#111422] border-r border-gray-800/80 p-2.5 space-y-3.5 select-none">
                    {/* New Note Button */}
                    <div
                      className="w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md text-gray-950 transition-colors duration-300"
                      style={{ backgroundColor: currentSeason.accentHex }}
                    >
                      <span>+</span>
                      <span>New Note</span>
                    </div>

                    {/* Quick Nav Links */}
                    <div className="space-y-0.5 text-[11px]">
                      <div
                        className="flex items-center justify-between px-2 py-1.5 rounded-md font-semibold"
                        style={{
                          backgroundColor: `${currentSeason.accentHex}15`,
                          color: currentSeason.accentHex,
                        }}
                      >
                        <span className="flex items-center space-x-1.5">
                          <span>📋</span>
                          <span>All Notes</span>
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-bold"
                          style={{
                            backgroundColor: `${currentSeason.accentHex}30`,
                            color: currentSeason.accentHex,
                          }}
                        >
                          129
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-gray-400 hover:text-gray-200">
                        <span className="flex items-center space-x-1.5">
                          <span>⭐</span>
                          <span>Starred</span>
                        </span>
                        <span className="text-[10px] opacity-70">12</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-gray-400 hover:text-gray-200">
                        <span className="flex items-center space-x-1.5">
                          <span>📅</span>
                          <span>Today</span>
                        </span>
                        <span className="text-[10px] opacity-70">8</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-gray-400 hover:text-gray-200">
                        <span className="flex items-center space-x-1.5">
                          <span>🗓️</span>
                          <span>Calendar</span>
                        </span>
                        <span className="text-[10px] opacity-70">18</span>
                      </div>
                      <div className="flex items-center space-x-1.5 px-2 py-1.5 rounded-md text-gray-400">
                        <span>🏷️</span>
                        <span>Tags</span>
                      </div>
                      <div className="flex items-center space-x-1.5 px-2 py-1.5 rounded-md text-gray-400">
                        <span>📎</span>
                        <span>Attachments</span>
                      </div>
                    </div>

                    {/* Workspaces Section */}
                    <div className="pt-2 border-t border-gray-800/80 space-y-1">
                      <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-gray-400">Workspaces</div>
                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex items-center space-x-1.5 px-2 py-1 rounded text-gray-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentSeason.accentHex }} />
                          <span>Personal</span>
                        </div>
                        <div className="flex items-center space-x-1.5 px-2 py-1 rounded text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span>Work</span>
                        </div>
                        <div className="flex items-center space-x-1.5 px-2 py-1 rounded text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <span>Research</span>
                        </div>
                        <div className="flex items-center space-x-1.5 px-2 py-1 rounded text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>Ideas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Main Editor View */}
                  <div className="col-span-12 sm:col-span-9 md:col-span-6 lg:col-span-6 p-3 sm:p-5 bg-[#0e111a] space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      {/* Breadcrumb / Category Tag */}
                      <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400">
                        <span
                          className="px-2 py-0.5 rounded font-semibold border"
                          style={{
                            backgroundColor: `${currentSeason.accentHex}15`,
                            color: currentSeason.accentHex,
                            borderColor: `${currentSeason.accentHex}30`,
                          }}
                        >
                          # Ideas
                        </span>
                        <span>/</span>
                        <span>Today</span>
                      </div>

                      {/* Note Title */}
                      <h2 className="text-base sm:text-xl font-serif font-bold text-gray-100 tracking-tight leading-snug">
                        Ideas for a Better Tomorrow
                      </h2>

                      {/* Intro Paragraph */}
                      <p
                        className="text-gray-400 text-[11px] sm:text-xs leading-relaxed italic border-l-2 pl-2.5 py-0.5"
                        style={{ borderColor: `${currentSeason.accentHex}80` }}
                      >
                        Small, consistent steps create meaningful change. Here are a few ideas I want to explore further...
                      </p>

                      {/* Checklist Items */}
                      <div className="space-y-1.5 pt-1 text-xs text-gray-300">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold"
                            style={{
                              backgroundColor: `${currentSeason.accentHex}20`,
                              borderColor: `${currentSeason.accentHex}80`,
                              color: currentSeason.accentHex,
                            }}
                          >
                            ✓
                          </span>
                          <span className="line-through text-gray-400">Design a more focused daily workflow</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center text-[10px]" />
                          <span className="text-gray-200">Explore AI-assisted knowledge connections</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center text-[10px]" />
                          <span className="text-gray-200">Plan the next iteration of NoteNirman</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center text-[10px]" />
                          <span className="text-gray-200">Read and summarize key research papers</span>
                        </div>
                      </div>
                    </div>

                    {/* Note Footer Tags */}
                    <div className="pt-2 border-t border-gray-800/80 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono">
                        #Productivity
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-mono">
                        #AI
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">
                        #Research
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Gemini Copilot Drawer */}
                  <div className="hidden lg:block lg:col-span-3 bg-[#111524] border-l border-gray-800/80 p-3 space-y-3 select-none">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                      <div className="flex items-center space-x-1.5 font-semibold text-xs" style={{ color: currentSeason.accentHex }}>
                        <span>🤖</span>
                        <span>Gemini Copilot</span>
                      </div>
                      <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentSeason.accentHex }} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#161c30] border border-gray-800 space-y-2 text-[11px]">
                      <p className="text-gray-300 leading-relaxed">
                        Here are some related ideas based on your notes...
                      </p>
                      <div className="space-y-1 text-gray-300 font-medium">
                        <div className="p-1 rounded bg-[#1e2642] text-gray-200">1. Building a habit system</div>
                        <div className="p-1 rounded bg-[#1e2642] text-gray-200">2. Long-term knowledge graph</div>
                        <div className="p-1 rounded bg-[#1e2642] text-gray-200">3. Tools for deeper focus</div>
                      </div>
                      <button
                        className="w-full mt-1 py-1 rounded text-[10px] font-bold transition-colors"
                        style={{
                          backgroundColor: `${currentSeason.accentHex}20`,
                          color: currentSeason.accentHex,
                        }}
                      >
                        Explore more →
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Laptop Keyboard Base & Trackpad Visual */}
            <div className="relative mx-auto w-[92%] h-4 bg-gradient-to-b from-[#252528] via-[#1a1a1c] to-[#0e0e10] rounded-b-xl border-t border-gray-700/50 shadow-2xl flex justify-center">
              <div className="w-20 h-1 bg-gray-600/50 rounded-b-sm" />
            </div>
          </div>

          {/* Desk Surrounding Props: Mug, Books, Open Notebook */}
          <div className="relative z-10 mt-4 sm:mt-6 flex flex-wrap items-end justify-between gap-4 px-2 sm:px-6">
            
            {/* Left Desk Elements: Books Stack */}
            <div className="hidden sm:flex items-end space-x-1.5 opacity-95">
              <div className="flex flex-col space-y-1">
                <div
                  className="w-24 h-5 rounded-sm border-l-4 text-[9px] font-mono text-gray-200/90 flex items-center px-2 shadow"
                  style={{ backgroundColor: currentSeason.bookColors[0], borderColor: currentSeason.accentHex }}
                >
                  Better Thinking
                </div>
                <div
                  className="w-28 h-5.5 rounded-sm border-l-4 text-[9px] font-mono text-gray-200/90 flex items-center px-2 shadow"
                  style={{ backgroundColor: currentSeason.bookColors[1], borderColor: `${currentSeason.accentHex}aa` }}
                >
                  A Calmer Mind
                </div>
                <div
                  className="w-32 h-6 rounded-sm border-l-4 text-[9px] font-mono text-gray-100 flex items-center px-2 shadow font-bold"
                  style={{ backgroundColor: currentSeason.bookColors[2], borderColor: currentSeason.accentHex }}
                >
                  Sharper You
                </div>
              </div>
            </div>

            {/* Center Desk Element: Ceramic Mug with Steam */}
            <div className="mx-auto sm:mx-0 flex items-center space-x-3">
              <div className="relative group">
                {/* Animated Steam */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex space-x-1 pointer-events-none">
                  <motion.span
                    animate={{ y: [-2, -10], opacity: [0, 0.7, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    className="w-1 h-3 rounded-full bg-white/40 blur-xs"
                  />
                  <motion.span
                    animate={{ y: [-2, -12], opacity: [0, 0.6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                    className="w-1 h-4 rounded-full bg-white/40 blur-xs"
                  />
                </div>

                {/* Mug Body */}
                <div className="relative px-3.5 py-2 rounded-2xl bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 shadow-xl flex items-center space-x-2">
                  <div className="text-center font-serif text-[11px] font-semibold text-gray-200 leading-tight">
                    {currentSeason.mugText}
                  </div>
                  {/* Handle */}
                  <div className="w-3 h-5 rounded-r-full border-2 border-l-0 border-gray-700" />
                </div>
              </div>
            </div>

            {/* Right Desk Element: Open Leather Notebook */}
            <div className="hidden md:flex items-center p-2.5 rounded-lg bg-gray-900 border border-gray-800 shadow-lg text-[10px] font-serif text-gray-300 italic space-x-2">
              <span>✍️</span>
              <span>"{currentSeason.journalText}"</span>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default HeroProductPreview;
