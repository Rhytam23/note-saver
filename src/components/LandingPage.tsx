import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Theme } from '../types';
import { SunIcon, MoonIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';
import { HeroProductPreview, HERO_THEMES, SeasonalThemeMode } from './HeroProductPreview';
import { NoteNirmanLogo } from './NoteNirmanLogo';
import GetTheApp from './GetTheApp';
import Footer from './Footer';

interface LandingPageProps {
  onGetStarted: () => void;
  theme: Theme;
  toggleTheme: () => void;
  setView: (view: 'landing' | 'auth' | 'app' | 'privacy' | 'terms' | 'faq') => void;
  onQuickAccess?: () => void;
}

const ALL_SEASONAL_THEMES: { id: SeasonalThemeMode; label: string }[] = [
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'monsoon', label: 'Monsoon' },
  { id: 'diwali', label: 'Diwali' },
  { id: 'holi', label: 'Holi' },
  { id: 'pongal', label: 'Pongal' },
  { id: 'navratri', label: 'Navratri' },
  { id: 'christmas', label: 'Christmas' },
  { id: 'new_year', label: 'New Year' },
  { id: 'independence_day_in', label: 'Independence Day' },
  { id: 'none', label: 'Classic' },
];

// Every entry here maps to something that ships in the app today.
const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Works without a connection',
    body: 'Notes are written to your device first. Lose signal on a train and keep typing; everything syncs when you are back online, and the app tells you when a note has not synced yet.',
  },
  {
    title: 'An editor that stays out of your way',
    body: 'Type / to insert headings, lists, checklists, tables, equations, quotes, code and callouts. Search inside a note with Ctrl+F, add a cover image, and dictate with your voice.',
  },
  {
    title: 'Made for studying',
    body: 'Write Question:: Answer on any line and it becomes a flashcard, reviewed with spaced repetition. Start from templates for class notes, Cornell notes, exam plans and assignments.',
  },
  {
    title: 'Connect your notes',
    body: 'Link notes with [[double brackets]] and see which other notes link back. A focus timer and word count sit beside the editor.',
  },
  {
    title: 'Gemini when you want it',
    body: 'Summarise a long note, proofread a draft or brainstorm from what you have written. It stays out of the way until you ask.',
  },
  {
    title: 'Find things again',
    body: 'Search your notes, then narrow by tag or priority. Give tags their own colours and pin the notes you reach for every day.',
  },
  {
    title: 'Sync conflicts do not eat your work',
    body: 'Edit the same note on two devices and you choose which version to keep, or keep both. Nothing is silently overwritten, and deleted notes wait in Trash for 30 days.',
  },
  {
    title: 'Yours to take with you',
    body: 'Export any note as PDF, Markdown or plain text, back up everything in one file, and import Markdown, HTML, text or CSV from other apps.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  theme,
  toggleTheme,
  setView,
  onQuickAccess,
}) => {
  const { theme: contextSeason, colors, setSeasonalTheme } = useSeason();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeSeason, setActiveSeason] = useState<SeasonalThemeMode>(() => {
    if (contextSeason && HERO_THEMES[contextSeason]) {
      return contextSeason as SeasonalThemeMode;
    }
    return 'autumn';
  });

  useEffect(() => {
    if (contextSeason && HERO_THEMES[contextSeason]) {
      setActiveSeason(contextSeason as SeasonalThemeMode);
    }
  }, [contextSeason]);

  const accent = (HERO_THEMES[activeSeason] || HERO_THEMES.autumn).accentHex;

  const handleSeasonSelect = (seasonId: SeasonalThemeMode) => {
    setActiveSeason(seasonId);
    setSeasonalTheme(seasonId);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) {
      return;
    }
    onQuickAccess?.();
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks: { label: string; onClick: () => void }[] = [
    { label: 'Features', onClick: () => scrollToSection('features') },
    { label: 'Themes', onClick: () => scrollToSection('themes') },
    { label: 'Download', onClick: () => scrollToSection('get-the-app') },
    { label: 'FAQ', onClick: () => { setMobileMenuOpen(false); setView('faq'); } },
  ];

  const navLinkClass = 'text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors';

  return (
    <motion.div
      key="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onDoubleClick={handleDoubleClick}
      className="flex-1 flex flex-col w-full cursor-default relative bg-transparent text-gray-900 dark:text-gray-100 overflow-x-hidden min-h-screen"
    >
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-[#090b10]/80 border-b border-gray-200/70 dark:border-gray-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="NoteNirman home"
          >
            <NoteNirmanLogo size="md" showText textClassName="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100" />
          </button>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {navLinks.map(link => (
              <button key={link.label} onClick={link.onClick} className={navLinkClass}>
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 transition-colors"
              aria-label="Toggle dark or light mode"
            >
              {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" style={{ color: accent }} />}
            </button>
            <button onClick={onGetStarted} className={navLinkClass}>
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-2 rounded-md text-gray-950 transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Start writing
            </button>
          </div>

          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300"
              aria-label="Toggle dark or light mode"
            >
              {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" style={{ color: accent }} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(open => !open)}
              className="p-2 text-gray-700 dark:text-gray-200"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#090b10]/95 px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={link.onClick}
                className="block w-full text-left py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 flex gap-3">
              <button
                onClick={onGetStarted}
                className="flex-1 py-2.5 rounded-md text-sm font-semibold border border-gray-300 dark:border-gray-700"
              >
                Sign in
              </button>
              <button
                onClick={onGetStarted}
                className="flex-1 py-2.5 rounded-md text-sm font-semibold text-gray-950"
                style={{ backgroundColor: accent }}
              >
                Start writing
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="w-full">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-5">
              <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-gray-50">
                Notes that keep working when your connection doesn&rsquo;t.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-300 max-w-md">
                NoteNirman is a notes app for Windows, Android and the web. Write anywhere, sync when you can, and ask Gemini for help only when you want it.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={onGetStarted}
                  className="px-6 py-3 rounded-md font-semibold text-gray-950 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  Start writing
                </button>
                <button
                  onClick={() => scrollToSection('get-the-app')}
                  className="px-6 py-3 rounded-md font-semibold border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                >
                  Download the app
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Free to use. No credit card.</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-7"
            >
              <HeroProductPreview activeSeason={activeSeason} />
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={`border-y ${colors.border} ${colors.surface}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <h2 className={`text-3xl sm:text-4xl font-serif font-bold tracking-tight ${colors.primaryText}`}>
                Built around not losing your notes
              </h2>
              <p className={`mt-4 text-lg ${colors.secondaryText}`}>
                Most of what is in NoteNirman exists for one reason: what you wrote should still be there tomorrow, on every device.
              </p>
            </div>

            <dl className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-10">
              {FEATURES.map((feature, index) => (
                <div key={feature.title} className="flex gap-5">
                  <span
                    className="font-mono text-sm pt-1 tabular-nums select-none"
                    style={{ color: accent }}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <dt className={`text-lg font-semibold ${colors.primaryText}`}>{feature.title}</dt>
                    <dd className={`mt-1.5 leading-relaxed ${colors.secondaryText}`}>{feature.body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Themes: the seasonal system, shown as a choice rather than decoration */}
        <section id="themes" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h2 className={`text-3xl sm:text-4xl font-serif font-bold tracking-tight ${colors.primaryText}`}>
                A workspace that follows the calendar
              </h2>
              <p className={`mt-4 text-lg ${colors.secondaryText}`}>
                NoteNirman changes its colours and background with the season and the festivals. Pick one here and the whole page, and the app after you sign in, follows.
              </p>
            </div>
            <div className="lg:col-span-7">
              <div role="radiogroup" aria-label="Choose a theme" className="flex flex-wrap gap-2">
                {ALL_SEASONAL_THEMES.map(s => {
                  const isActive = activeSeason === s.id;
                  const swatch = HERO_THEMES[s.id].accentHex;
                  return (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => handleSeasonSelect(s.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md border text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-transparent text-gray-950'
                          : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
                      }`}
                      style={isActive ? { backgroundColor: swatch } : undefined}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-black/10"
                        style={{ backgroundColor: swatch }}
                        aria-hidden="true"
                      />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <GetTheApp accent={accent} onOpenWebApp={onGetStarted} />
      </main>

      <Footer
        variant="detailed"
        onPrivacyClick={() => setView('privacy')}
        onTermsClick={() => setView('terms')}
        onFAQClick={() => setView('faq')}
      />
    </motion.div>
  );
};

export default LandingPage;
