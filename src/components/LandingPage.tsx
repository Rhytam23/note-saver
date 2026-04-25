import React from 'react';
import { motion, Variants } from 'framer-motion';
import type { Theme } from '../types';
import { SunIcon, MoonIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';
import KeyFeatures from './KeyFeatures';
import WhyChooseUs from './WhyChooseUs';
import Testimonials from './Testimonials';
import FeatureHighlights from './FeatureHighlights';
import Footer from './Footer';

interface LandingPageProps {
  onGetStarted: () => void;
  theme: Theme;
  toggleTheme: () => void;
  setView: (view: 'landing' | 'auth' | 'app' | 'privacy' | 'terms' | 'faq') => void;
}

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: any = {
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

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, theme, toggleTheme, setView }) => {
  const { colors, theme: seasonalTheme } = useSeason();

  return (
    <motion.div
      key="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="flex-1 flex flex-col w-full"
    >
      <header className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20`}>
        <div className="flex items-center space-x-2">
          <span className="text-3xl" role="img" aria-label="lamp">🪔</span>
          <h1 className={`text-2xl font-mono font-bold ${colors.primaryText}`}>Notenirman</h1>
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
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center p-4 relative bg-gradient-to-b from-primary-bg-light/10 to-primary-bg-light/30 dark:from-primary-bg/10 dark:to-primary-bg/30">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="z-10"
        >
          <motion.div
            variants={itemVariants}
            className="mb-8 flex justify-center items-center h-40"
          >
            {seasonalTheme === 'christmas' ? (
              <svg width="120" height="160" viewBox="0 0 100 140" className="drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                <path d="M50 20 L75 60 H25 L50 20 Z" fill="#15803d" />
                <path d="M50 40 L80 90 H20 L50 40 Z" fill="#166534" />
                <path d="M50 70 L90 130 H10 L50 70 Z" fill="#14532d" />
                <rect x="42" y="130" width="16" height="10" fill="#3f2e18" />
                <path d="M50 5 L53 15 H63 L55 22 L58 32 L50 26 L42 32 L45 22 L37 15 H47 Z" fill="#fbbf24" className="animate-pulse" />
                <circle cx="35" cy="55" r="3" fill="#ef4444" className="animate-bounce" style={{ animationDuration: '2s' }} />
                <circle cx="65" cy="80" r="3" fill="#3b82f6" className="animate-bounce" style={{ animationDuration: '2.5s' }} />
                <circle cx="45" cy="100" r="3" fill="#fbbf24" className="animate-bounce" style={{ animationDuration: '3s' }} />
                <circle cx="70" cy="115" r="3" fill="#ef4444" className="animate-bounce" style={{ animationDuration: '2.2s' }} />
              </svg>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-6xl md:text-7xl drop-shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>📄</span>
                <span className="text-4xl md:text-5xl text-accent">+</span>
                <span className="text-6xl md:text-7xl drop-shadow-xl animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.2s' }}>🤖</span>
              </div>
            )}
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className={`text-4xl md:text-6xl font-serif font-extrabold ${colors.primaryText} mb-4`}
          >
            Crafted for <span className="text-accent">Thoughts</span>, Colored by <span className="text-accent">Life</span>.
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className={`max-w-2xl mx-auto text-lg md:text-xl ${colors.secondaryText} mb-8`}
          >
            An intelligent, beautiful, and seasonally-aware note-taking app designed to keep you organized and inspired. Powered by Gemini AI.
          </motion.p>
          <motion.div variants={itemVariants}>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0px 10px 30px -10px #FFB400" }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="bg-accent text-primary-bg font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-shadow duration-300"
            >
              Get Started for Free
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Subsequent sections */}
      <div className="w-full z-10">
        <KeyFeatures />
        
        {/* Purpose Section for Google Verification */}
        <section className={`py-20 px-4 border-y ${colors.border} ${colors.surface}`}>
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

        <FeatureHighlights />
        <WhyChooseUs />
        <Testimonials />
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
