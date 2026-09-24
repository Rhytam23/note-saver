import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HERO_THEMES, type SeasonalThemeMode } from './HeroProductPreview';
import { useMotionCapability } from '../hooks/useMotionCapability';

/** The order the scroll tour walks through the year (Classic is not a calendar theme). */
export const YEAR_TOUR: SeasonalThemeMode[] = [
  'new_year',
  'pongal',
  'winter',
  'holi',
  'spring',
  'summer',
  'monsoon',
  'independence_day_in',
  'navratri',
  'autumn',
  'diwali',
  'christmas',
];

const CHECKLIST = [
  { text: 'Revise Unit 3 notes', done: true },
  { text: 'Make flashcards for formulas', done: false },
  { text: 'Mock test on Friday', done: false },
];

/**
 * A note as it looks in the chosen theme. It replaces the old, mostly empty card stack: the
 * point of this section is to show what a themed note actually looks like, and it crossfades
 * as the season changes (by scroll, or by tapping a swatch).
 */
export const SeasonalShowcase: React.FC<{ season: SeasonalThemeMode }> = ({ season }) => {
  const theme = HERO_THEMES[season] || HERO_THEMES.autumn;
  const { tier } = useMotionCapability();
  const still = tier === 'off';
  const fade = still ? { duration: 0 } : { duration: 0.5 };

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0" aria-hidden="true">
      {/* Two cards peeking out behind, tinted by the theme. */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-white/5 shadow-xl"
        style={{ rotate: -6, x: -14, y: 10 }}
        animate={{ backgroundColor: theme.bookColors[0] }}
        transition={fade}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl border border-white/5 shadow-xl"
        style={{ rotate: 3.5, x: 10, y: 4 }}
        animate={{ backgroundColor: theme.bookColors[1] }}
        transition={fade}
      />

      <motion.div
        className="relative rounded-2xl border p-5 sm:p-6 shadow-2xl text-gray-200"
        animate={{ backgroundColor: theme.bookColors[2], borderColor: `${theme.accentHex}66` }}
        transition={fade}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={season}
              initial={still ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={still ? undefined : { opacity: 0, y: 6 }}
              transition={{ duration: still ? 0 : 0.2 }}
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: theme.accentHex, backgroundColor: `${theme.accentHex}22` }}
            >
              {theme.themeLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        <h3 className="mt-5 text-xl sm:text-2xl font-serif font-bold text-white">Physics revision</h3>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={season}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={still ? undefined : { opacity: 0 }}
            transition={{ duration: still ? 0 : 0.25 }}
            className="mt-1.5 text-sm italic text-gray-300"
          >
            &ldquo;{theme.journalText}&rdquo;
          </motion.p>
        </AnimatePresence>

        <ul className="mt-5 space-y-2.5">
          {CHECKLIST.map(item => (
            <li key={item.text} className="flex items-center gap-3 text-sm">
              <motion.span
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border text-[11px] leading-none text-gray-950"
                animate={{
                  borderColor: theme.accentHex,
                  backgroundColor: item.done ? theme.accentHex : 'rgba(0,0,0,0)',
                }}
                transition={fade}
              >
                {item.done ? '✓' : ''}
              </motion.span>
              <span className={item.done ? 'line-through text-gray-500' : 'text-gray-200'}>{item.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {['physics', 'exam'].map(tag => (
            <motion.span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-full border"
              animate={{ color: theme.accentHex, borderColor: `${theme.accentHex}55`, backgroundColor: `${theme.accentHex}14` }}
              transition={fade}
            >
              #{tag}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default SeasonalShowcase;
