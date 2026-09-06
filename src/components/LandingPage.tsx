import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Theme } from '../types';
import { SunIcon, MoonIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';
import { HeroProductPreview } from './HeroProductPreview';
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
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
      stiffness: 100,
      damping: 15,
    },
  },
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, theme, toggleTheme, setView, onQuickAccess }) => {
  const { colors } = useSeason();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    }
  };

  return (
    <motion.div
      key="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onDoubleClick={handleDoubleClick}
      className="flex-1 flex flex-col w-full cursor-default select-none relative"
    >
      {/* SaaS Navigation Header */}
      <header className="sticky top-0 left-0 right-0 z-30 backdrop-blur-md bg-white/70 dark:bg-gray-950/70 border-b border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <NoteNirmanLogo size="md" showText textClassName={`text-xl ${colors.primaryText}`} />
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-600 dark:text-gray-300 hover:text-accent dark:hover:text-accent transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('ai-copilot')}
              className="text-gray-600 dark:text-gray-300 hover:text-accent dark:hover:text-accent transition-colors"
            >
              AI Copilot
            </button>
            <button
              onClick={() => scrollToSection('purpose')}
              className="text-gray-600 dark:text-gray-300 hover:text-accent dark:hover:text-accent transition-colors"
            >
              About
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${colors.hover} transition-colors duration-200`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ?
                <MoonIcon className={`h-5 w-5 ${colors.primaryText}`} /> :
                <SunIcon className="h-5 w-5 text-accent" />
              }
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-accent transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="bg-accent text-primary-bg font-bold text-sm px-5 py-2 rounded-full shadow-md hover:shadow-lg hover:opacity-95 transition-all duration-200"
            >
              Get Started for Free
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${colors.hover} transition-colors duration-200`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ?
                <MoonIcon className={`h-5 w-5 ${colors.primaryText}`} /> :
                <SunIcon className="h-5 w-5 text-accent" />
              }
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-accent focus:outline-none"
              aria-label="Toggle mobile menu"
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

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-gray-200/80 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 pt-3 pb-6 space-y-3"
          >
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-accent"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('ai-copilot')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-accent"
            >
              AI Copilot
            </button>
            <button
              onClick={() => scrollToSection('purpose')}
              className="block w-full text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-accent"
            >
              About
            </button>
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col space-y-2">
              <button
                onClick={onGetStarted}
                className="w-full text-center py-2.5 rounded-full font-bold bg-accent text-primary-bg text-sm shadow"
              >
                Get Started for Free
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Redesigned SaaS Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 overflow-hidden bg-gradient-to-b from-transparent via-accent/5 to-transparent">
        {/* Soft Background Atmosphere Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center z-10 relative space-y-6"
        >
          {/* Eyebrow Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center justify-center">
            <span className="px-3.5 py-1 text-xs font-mono font-semibold rounded-full border border-accent/30 bg-accent/10 text-accent backdrop-blur-md shadow-sm">
              ✨ NOTE-NIRMAN 2.0 — INTELLIGENT KNOWLEDGE WORKSPACE
            </span>
          </motion.div>

          {/* Huge Main Headline */}
          <motion.h1
            variants={itemVariants}
            className={`text-4xl sm:text-6xl lg:text-7xl font-serif font-extrabold tracking-tight leading-[1.1] ${colors.primaryText}`}
          >
            Your thoughts, <span className="text-accent">organized</span> into something more.
          </motion.h1>

          {/* Concise Supporting Description */}
          <motion.p
            variants={itemVariants}
            className={`max-w-2xl mx-auto text-base sm:text-lg md:text-xl leading-relaxed ${colors.secondaryText}`}
          >
            An intelligent offline-first block workspace designed to capture ideas, connect knowledge, and streamline collaboration — empowered by Gemini AI.
          </motion.p>

          {/* Call-to-Action Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-accent text-primary-bg font-bold py-3.5 px-8 rounded-full text-base shadow-xl hover:shadow-accent/25 transition-all duration-300"
            >
              Get Started for Free
            </motion.button>
            <button
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-base font-semibold text-gray-700 dark:text-gray-300 hover:text-accent border border-gray-300/80 dark:border-gray-700 hover:border-accent transition-all duration-200"
            >
              Explore Features ↓
            </button>
          </motion.div>
        </motion.div>

        {/* Large Product Workspace Preview */}
        <HeroProductPreview />
      </section>

      {/* Feature Sections */}
      <div className="w-full z-10">
        <div id="features">
          <KeyFeatures />
        </div>
        
        <section id="purpose" className={`py-20 px-4 border-y ${colors.border} ${colors.surface}`}>
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className={`text-3xl md:text-5xl font-serif font-bold ${colors.primaryText}`}>
              Our <span className="text-accent">Purpose</span>
            </h2>
            <p className={`text-xl md:text-2xl leading-relaxed ${colors.secondaryText}`}>
              Notenirman is an intelligent, seasonally-aware note-taking application designed to help you organize your thoughts with the power of Gemini AI. 
              Our mission is to provide a beautiful and focused space where your ideas can grow, colored by the world around you.
            </p>
            <div className="flex justify-center gap-4 pt-4 text-4xl">
              <span title="Notes">📄</span>
              <span className="text-accent">+</span>
              <span title="AI Support">🤖</span>
              <span className="text-accent">+</span>
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

