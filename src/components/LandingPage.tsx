import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../types';
import { SunIcon, MoonIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';
import { HeroProductPreview, HERO_THEMES, SeasonalThemeMode } from './HeroProductPreview';
import { NoteNirmanLogo } from './NoteNirmanLogo';
import KeyFeatures from './KeyFeatures';
import WhyChooseUs from './WhyChooseUs';
import Testimonials from './Testimonials';
import FeatureHighlights from './FeatureHighlights';
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
  { id: 'autumn', label: 'Autumn 🍁' },
  { id: 'winter', label: 'Winter ❄️' },
  { id: 'spring', label: 'Spring 🌸' },
  { id: 'summer', label: 'Summer ☀️' },
  { id: 'monsoon', label: 'Monsoon 🌧️' },
  { id: 'diwali', label: 'Diwali 🪔' },
  { id: 'holi', label: 'Holi 🎨' },
  { id: 'pongal', label: 'Pongal 🌾' },
  { id: 'navratri', label: 'Navratri ✨' },
  { id: 'christmas', label: 'Christmas 🎄' },
  { id: 'new_year', label: 'New Year 🎉' },
  { id: 'independence_day_in', label: 'Independence 🇮🇳' },
  { id: 'none', label: 'Classic 💡' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 90,
      damping: 15,
    },
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  theme,
  toggleTheme,
  setView,
  onQuickAccess,
}) => {
  const { theme: contextSeason, colors } = useSeason();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Sync active season with context season by default, allow manual preview override
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

  const currentThemeConfig = HERO_THEMES[activeSeason] || HERO_THEMES.autumn;

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea')) {
      return;
    }
    onQuickAccess?.();
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'support') {
      setView('faq');
    }
  };

  return (
    <motion.div
      key="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onDoubleClick={handleDoubleClick}
      className="flex-1 flex flex-col w-full cursor-default select-none relative bg-gray-50 dark:bg-[#090b10] text-gray-900 dark:text-gray-100 overflow-x-hidden min-h-screen"
    >
      {/* SaaS Navigation Header */}
      <header className="sticky top-0 left-0 right-0 z-40 backdrop-blur-md bg-white/80 dark:bg-[#090b10]/80 border-b border-gray-200/60 dark:border-gray-800/60 transition-colors duration-300">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Top-Left Brand with Authoritative NoteNirman Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <NoteNirmanLogo size="md" showText textClassName="text-xl font-bold font-mono tracking-tight text-gray-900 dark:text-gray-100 group-hover:text-amber-500 transition-colors" />
          </div>

          {/* Desktop SaaS Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('ai-copilot')}
              className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors flex items-center space-x-1"
            >
              <span>AI Copilot</span>
              <span
                className="px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold"
                style={{
                  backgroundColor: `${currentThemeConfig.accentHex}20`,
                  color: currentThemeConfig.accentHex,
                }}
              >
                NEW
              </span>
            </button>

            <button
              onClick={() => scrollToSection('purpose')}
              className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              About
            </button>
            <button
              onClick={() => setView('faq')}
              className="text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            >
              Support
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Toggle dark/light theme"
            >
              {theme === 'light' ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" style={{ color: currentThemeConfig.accentHex }} />
              )}
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-amber-500 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="text-gray-950 font-bold text-sm px-5 py-2.5 rounded-full shadow-md hover:opacity-90 transition-all duration-200"
              style={{ backgroundColor: currentThemeConfig.accentHex }}
            >
              Get Started for Free
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-800/60 text-gray-600 dark:text-gray-300"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" style={{ color: currentThemeConfig.accentHex }} />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 dark:text-gray-200 focus:outline-none"
              aria-label="Toggle menu"
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

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#090b10]/95 px-4 pt-3 pb-6 space-y-3"
          >
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-amber-500"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('ai-copilot')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-amber-500"
            >
              AI Copilot
            </button>

            <button
              onClick={() => scrollToSection('purpose')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-amber-500"
            >
              About
            </button>
            <button
              onClick={() => setView('faq')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-amber-500"
            >
              Support
            </button>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col space-y-2">
              <button
                onClick={onGetStarted}
                className="w-full text-center py-2.5 rounded-full font-bold text-gray-950 text-sm shadow"
                style={{ backgroundColor: currentThemeConfig.accentHex }}
              >
                Get Started for Free
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* FULL-WIDTH CINEMATIC 2-COLUMN HERO SYSTEM */}
      <section className="relative w-full pt-8 pb-12 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto overflow-hidden">
        
        {/* Soft Ambient Background Glow dynamically adapting to current season accent */}
        <div
          className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] blur-[140px] rounded-full pointer-events-none opacity-20 transition-all duration-700"
          style={{ backgroundColor: currentThemeConfig.accentHex }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* LEFT SIDE: Brand / Product Messaging (~42% desktop width) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left"
          >
            {/* 1. Eyebrow Badge */}
            <motion.div variants={itemVariants} className="flex items-center">
              <span
                className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border text-xs font-mono font-semibold tracking-wider uppercase backdrop-blur-sm transition-all duration-300"
                style={{
                  backgroundColor: `${currentThemeConfig.accentHex}15`,
                  borderColor: `${currentThemeConfig.accentHex}40`,
                  color: currentThemeConfig.accentHex,
                }}
              >
                <span>✦</span>
                <span>THINK · WRITE · ORGANIZE · GROW</span>
              </span>
            </motion.div>

            {/* 2. Large Editorial Serif Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-serif font-extrabold text-gray-900 dark:text-gray-50 tracking-tight leading-[1.12]"
            >
              A calmer place<br />
              for a <span style={{ color: currentThemeConfig.accentHex }} className="transition-colors duration-300">sharper you.</span>
            </motion.h1>

            {/* 3. Supporting Description */}
            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl"
            >
              NoteNirman is your intelligent, offline-first workspace for notes, ideas, and knowledge — with AI that helps you think deeper, connect ideas, and get things done.
            </motion.p>

            {/* 4. CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGetStarted}
                className="text-gray-950 font-bold text-base px-7 py-3.5 rounded-full shadow-lg hover:opacity-90 transition-all duration-200 flex items-center space-x-2"
                style={{ backgroundColor: currentThemeConfig.accentHex }}
              >
                <span>Get Started for Free</span>
                <span>→</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowVideoModal(true)}
                className="px-6 py-3.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-amber-500 font-semibold text-base transition-all duration-200 flex items-center space-x-2.5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: `${currentThemeConfig.accentHex}20`,
                    color: currentThemeConfig.accentHex,
                  }}
                >
                  ▶
                </span>
                <span>Watch Video</span>
              </motion.button>
            </motion.div>

            {/* 5. Four Small Capability Highlights */}
            <motion.div variants={itemVariants} className="pt-4 border-t border-gray-200/70 dark:border-gray-800/70">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Highlight 1: Capture */}
                <div className="flex items-start space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${currentThemeConfig.accentHex}15`,
                      borderColor: `${currentThemeConfig.accentHex}30`,
                      color: currentThemeConfig.accentHex,
                    }}
                  >
                    📝
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Capture</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Capture anything that matters.</p>
                  </div>
                </div>

                {/* Highlight 2: Organize */}
                <div className="flex items-start space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${currentThemeConfig.accentHex}15`,
                      borderColor: `${currentThemeConfig.accentHex}30`,
                      color: currentThemeConfig.accentHex,
                    }}
                  >
                    🗂️
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Organize</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Organize thoughts effortlessly.</p>
                  </div>
                </div>

                {/* Highlight 3: Find */}
                <div className="flex items-start space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${currentThemeConfig.accentHex}15`,
                      borderColor: `${currentThemeConfig.accentHex}30`,
                      color: currentThemeConfig.accentHex,
                    }}
                  >
                    🔍
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Find</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Find knowledge instantly.</p>
                  </div>
                </div>

                {/* Highlight 4: Think Deeper */}
                <div className="flex items-start space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${currentThemeConfig.accentHex}15`,
                      borderColor: `${currentThemeConfig.accentHex}30`,
                      color: currentThemeConfig.accentHex,
                    }}
                  >
                    ✨
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">Think Deeper</h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Use Gemini AI to explore ideas.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div variants={itemVariants} className="pt-2 flex items-center space-x-2 text-xs text-gray-400">
              <span className="w-4 h-6 rounded-full border border-gray-400/50 flex items-start justify-center p-1">
                <span className="w-1 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: currentThemeConfig.accentHex }} />
              </span>
              <span>Scroll to explore</span>
            </motion.div>
          </motion.div>

          {/* RIGHT SIDE: Laptop Visual + Seasonal Environment (~58% desktop width) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-7 flex flex-col items-center"
          >
            <HeroProductPreview activeSeason={activeSeason} />

            {/* Interactive Seasonal Theme Selector Bar (Supports ALL 13 themes in repository) */}
            <div className="mt-4 w-full flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800/80 backdrop-blur-md shadow-sm">
              
              {/* Brand Concept Subtitle */}
              <div className="text-xs font-serif italic text-gray-500 dark:text-gray-400">
                "The seasons change. Your ideas stay."
              </div>

              {/* Scrollable / Interactive Seasonal Theme Switcher Pills */}
              <div className="flex items-center space-x-1.5 bg-gray-100 dark:bg-gray-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto max-w-full no-scrollbar">
                {ALL_SEASONAL_THEMES.map((s) => {
                  const isActive = activeSeason === s.id;
                  const itemConfig = HERO_THEMES[s.id];
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSeason(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? 'text-gray-950 shadow-sm font-bold scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      style={{
                        backgroundColor: isActive ? itemConfig.accentHex : 'transparent',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* VIDEO PREVIEW MODAL */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowVideoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
                <div className="flex items-center space-x-2">
                  <NoteNirmanLogo size="sm" showText textClassName="text-sm font-bold text-gray-200" />
                  <span className="text-xs text-gray-400">— NoteNirman 2.0 Feature Tour</span>
                </div>
                <button
                  onClick={() => setShowVideoModal(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Interactive Feature Video Presentation Canvas */}
              <div className="p-6 sm:p-10 space-y-6 text-center">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: `${currentThemeConfig.accentHex}20`,
                    color: currentThemeConfig.accentHex,
                  }}
                >
                  ▶
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold text-white">
                    Experience NoteNirman 2.0
                  </h3>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">
                    Intelligent local-first notes, connected knowledge, and Gemini AI copilot — designed to keep your mind calm and sharp.
                  </p>
                </div>

                <div className="flex justify-center gap-4 pt-2">
                  <button
                    onClick={() => {
                      setShowVideoModal(false);
                      onGetStarted();
                    }}
                    className="text-gray-950 font-bold px-6 py-2.5 rounded-full text-sm shadow"
                    style={{ backgroundColor: currentThemeConfig.accentHex }}
                  >
                    Try NoteNirman Now →
                  </button>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="px-5 py-2.5 rounded-full border border-gray-700 text-gray-300 hover:text-white text-sm"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature & Content Sections */}
      <div className="w-full z-10">
        <div id="features">
          <KeyFeatures />
        </div>
        
        <section id="purpose" className={`py-20 px-4 border-y ${colors.border} ${colors.surface}`}>
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className={`text-3xl md:text-5xl font-serif font-bold ${colors.primaryText}`}>
              Our <span style={{ color: currentThemeConfig.accentHex }}>Purpose</span>
            </h2>
            <p className={`text-xl md:text-2xl leading-relaxed ${colors.secondaryText}`}>
              NoteNirman is an intelligent, seasonally-aware note-taking application designed to help you organize your thoughts with the power of Gemini AI. 
              Our mission is to provide a beautiful and focused space where your ideas can grow, colored by the world around you.
            </p>
            <div className="flex justify-center gap-4 pt-4 text-4xl">
              <span title="Notes">📄</span>
              <span style={{ color: currentThemeConfig.accentHex }}>+</span>
              <span title="AI Support">🤖</span>
              <span style={{ color: currentThemeConfig.accentHex }}>+</span>
              <span title="Seasonal Inspiration">🌸</span>
            </div>
          </div>
        </section>

        <div id="ai-copilot">
          <FeatureHighlights />
        </div>



        <WhyChooseUs />
        <Testimonials />
        <GetTheApp />
        <Footer
          variant="detailed" 
          onPrivacyClick={() => setView('privacy')} 
          onTermsClick={() => setView('terms')} 
          onFAQClick={() => setView('faq')}
        />
      </div>

    </motion.div>
  );
};

export default LandingPage;
