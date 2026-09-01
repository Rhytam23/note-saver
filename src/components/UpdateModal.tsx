import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { CloseIcon } from './Icons';
import type { UpdateInfo } from '../services/updateService';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const { colors } = useSeason();

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${colors.bgSimple} ${colors.border} ${colors.primaryText} relative overflow-hidden`}
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">New Update Available</h3>
              <p className={`text-xs ${colors.secondaryText}`}>
                Version v{updateInfo.latestVersion} is out! (Current: v{updateInfo.currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${colors.hover}`}
            aria-label="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {updateInfo.releaseNotes && (
          <div className={`my-4 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 max-h-36 overflow-y-auto text-xs leading-relaxed ${colors.secondaryText}`}>
            <p className="font-semibold mb-1 text-accent">What's New:</p>
            <p className="whitespace-pre-line">{updateInfo.releaseNotes}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 bg-accent text-primary-bg font-bold rounded-xl shadow-lg hover:shadow-accent/30 transition-all text-xs flex items-center justify-center space-x-2"
          >
            <span>Install Update Now</span>
            <span>➔</span>
          </button>
          <button
            onClick={onClose}
            className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all ${colors.border} ${colors.hover} ${colors.secondaryText}`}
          >
            Remind Me Later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UpdateModal;
