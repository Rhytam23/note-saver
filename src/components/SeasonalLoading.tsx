import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';

const SeasonalLoading: React.FC = () => {
  const { theme: seasonalTheme, colors } = useSeason();

  const renderIcon = () => {
    switch (seasonalTheme) {
      case 'summer':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="text-6xl"
          >
            ☀️
          </motion.div>
        );
      case 'monsoon':
        return (
          <div className="relative">
            <motion.div
              animate={{ 
                x: [-10, 10, -10],
                filter: ['brightness(0.3)', 'brightness(1)', 'brightness(0.3)']
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl"
            >
              ⛈️
            </motion.div>
          </div>
        );
      case 'winter':
      case 'christmas':
        return (
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl"
          >
            ❄️
          </motion.div>
        );
      case 'diwali':
        return (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl"
          >
            🪔
          </motion.div>
        );
      case 'holi':
        return (
          <motion.div
            animate={{ 
                scale: [0.8, 1.2, 0.8],
                rotate: [0, 90, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl"
          >
            🎨
          </motion.div>
        );
      case 'independence_day_in':
        return (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl"
          >
            🇮🇳
          </motion.div>
        );
      default:
        return (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl"
          >
            🪔
          </motion.div>
        );
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col items-center justify-center gap-6 ${colors.bgSimple}`}>
      {renderIcon()}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-xl font-medium ${colors.primaryText} opacity-80`}
      >
        Setting up your thoughts...
      </motion.div>
    </div>
  );
};

export default SeasonalLoading;
