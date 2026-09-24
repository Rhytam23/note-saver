import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { ChevronLeftIcon, CheckCircleIcon } from './Icons';

interface CookieSettings {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

const DEFAULT_COOKIES: CookieSettings = {
  essential: true,
  analytics: true,
  functional: true,
};

const CookiePreferences: React.FC = () => {
  const { colors } = useSeason();
  const { pushPath } = useRouter();
  const [cookies, setCookies] = useState<CookieSettings>(() => {
    try {
      const saved = localStorage.getItem('cookie_preferences');
      return saved ? JSON.parse(saved) : DEFAULT_COOKIES;
    } catch {
      return DEFAULT_COOKIES;
    }
  });
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSave = () => {
    try {
      localStorage.setItem('cookie_preferences', JSON.stringify(cookies));
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (e) {
      console.error('Failed to save cookie preferences:', e);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col p-4 sm:p-8 font-sans ${colors.bgSimple}`}>
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => pushPath('/')}
          className={`flex items-center space-x-2 ${colors.secondaryText} hover:text-accent transition-colors`}
        >
          <ChevronLeftIcon className="h-6 w-6" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className={`text-xl font-serif font-bold ${colors.primaryText}`}>Cookie Preferences</h1>
      </header>

      <main className="max-w-4xl w-full mx-auto flex-1">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 sm:p-8 rounded-2xl border backdrop-blur-lg ${colors.surface} ${colors.border} space-y-8 shadow-lg`}
        >
          <div>
            <h2 className={`text-2xl font-serif font-bold ${colors.primaryText} mb-2`}>
              Manage Cookie Settings
            </h2>
            <p className={`text-sm ${colors.secondaryText}`}>
              We use cookies to personalize your NoteNirman experience, maintain your authentication state, and optimize performance. You can customize your consent preferences below.
            </p>
          </div>

          <div className="space-y-6 divide-y divide-gray-200 dark:divide-gray-800">
            <div className="pt-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${colors.primaryText}`}>Essential Cookies</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">Required</span>
                </div>
                <p className={`text-xs ${colors.secondaryText}`}>
                  Necessary for core application security, authentication sessions, and local note persistence. These cannot be disabled.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent opacity-60 cursor-not-allowed mt-1"
              />
            </div>

            <div className="pt-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className={`font-bold ${colors.primaryText}`}>Analytics & Performance</h3>
                <p className={`text-xs ${colors.secondaryText}`}>
                  Help us understand application speed and usage patterns via Vercel Speed Insights to improve user experience.
                </p>
              </div>
              <input
                type="checkbox"
                checked={cookies.analytics}
                onChange={(e) => setCookies({ ...cookies, analytics: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer mt-1"
              />
            </div>

            <div className="pt-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className={`font-bold ${colors.primaryText}`}>Customization & Seasonal Themes</h3>
                <p className={`text-xs ${colors.secondaryText}`}>
                  Remember your seasonal theme preferences, sidebar collapses, and editor customizations across sessions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={cookies.functional}
                onChange={(e) => setCookies({ ...cookies, functional: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer mt-1"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              onClick={() => setCookies({ essential: true, analytics: true, functional: true })}
              className={`text-xs font-semibold ${colors.secondaryText} hover:text-accent underline`}
            >
              Reset to Recommended
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all shadow-md text-sm"
            >
              Save Preferences
            </button>
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {showSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-success text-white px-4 py-3 rounded-xl shadow-lg flex items-center space-x-2 text-sm font-semibold"
          >
            <CheckCircleIcon className="h-5 w-5 text-white" />
            <span>Cookie preferences updated!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CookiePreferences;
