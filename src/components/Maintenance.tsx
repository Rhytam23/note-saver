import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { ChevronLeftIcon } from './Icons';

const Maintenance: React.FC = () => {
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
          <div className="h-24 w-24 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-4xl shadow-inner animate-pulse">
            🛠️
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
            Scheduled Maintenance
          </span>
          <h1 className={`text-3xl font-serif font-bold ${colors.primaryText}`}>
            Under Maintenance
          </h1>
          <p className={`text-sm ${colors.secondaryText} max-w-md mx-auto`}>
            NoteNirman is currently undergoing routine system maintenance and optimization. Services will be restored shortly. Thank you for your patience!
          </p>
        </div>

        <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 text-xs text-left space-y-1">
          <div className="flex items-center justify-between font-bold text-accent">
            <span>System Status</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
              Updating
            </span>
          </div>
          <p className={colors.secondaryText}>
            Our engineering team is improving database performance and AI service reliability.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => pushPath('/')}
            className="w-full sm:w-auto px-6 py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all shadow-md text-sm"
          >
            Check Status & Refresh
          </button>
          <button
            onClick={() => pushPath('/support')}
            className={`w-full sm:w-auto px-6 py-3 border ${colors.border} ${colors.primaryText} ${colors.hover} font-medium rounded-xl transition-all text-sm`}
          >
            Contact Support
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
