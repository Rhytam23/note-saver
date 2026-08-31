import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { ChevronLeftIcon } from './Icons';

const NotFound: React.FC = () => {
  const { colors } = useSeason();
  const { pushPath } = useRouter();

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative font-sans ${colors.bgSimple}`}>
      <button
        onClick={() => pushPath('/')}
        className={`absolute top-6 left-6 flex items-center space-x-2 ${colors.secondaryText} hover:text-accent transition-colors`}
      >
        <ChevronLeftIcon className="h-6 w-6" />
        <span className="font-medium">Back to Home</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-lg p-8 rounded-2xl shadow-xl border backdrop-blur-lg ${colors.surface} ${colors.border} text-center space-y-6`}
      >
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-4xl shadow-inner">
            🔍
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            Error 404
          </span>
          <h1 className={`text-3xl font-serif font-bold ${colors.primaryText}`}>
            Page Not Found
          </h1>
          <p className={`text-sm ${colors.secondaryText} max-w-md mx-auto`}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => pushPath('/')}
            className="w-full sm:w-auto px-6 py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all shadow-md"
          >
            Return to Homepage
          </button>
          <button
            onClick={() => pushPath('/support')}
            className={`w-full sm:w-auto px-6 py-3 border ${colors.border} ${colors.primaryText} ${colors.hover} font-medium rounded-xl transition-all`}
          >
            Contact Support
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
