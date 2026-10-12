import React from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { CloseIcon } from './Icons';
import type { UpdateInfo } from '../hooks/useUpdateCheck';
import { openInSystemBrowser } from '../services/platform/nativeAuthBridge';

interface UpdateModalProps {
  info: UpdateInfo;
  onClose: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ info, onClose }) => {
  const { colors } = useSeason();

  const handleDownload = () => {
    void openInSystemBrowser(info.downloadUrl);
  };

  const handleChangelog = (e: React.MouseEvent) => {
    e.preventDefault();
    void openInSystemBrowser(info.releaseUrl);
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
                Version v{info.latestVersion} is out!
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

        <div className={`my-4 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 max-h-36 overflow-y-auto text-xs leading-relaxed ${colors.secondaryText}`}>
          <p className="font-semibold mb-1 text-accent">What's New:</p>
          {info.notes && <p className="whitespace-pre-line mb-2">{info.notes}</p>}
          <a
            href={info.releaseUrl}
            onClick={handleChangelog}
            className="text-accent underline underline-offset-2 hover:no-underline"
          >
            Full Changelog
          </a>
        </div>

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
