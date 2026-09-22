import React from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { openInSystemBrowser } from '../services/platform/nativeAuthBridge';

/**
 * A small dismissible strip telling desktop/Android users a newer build
 * exists and linking to it - never a silent auto-update. Renders nothing
 * on web, and nothing until a genuinely newer version is confirmed.
 */
const UpdateBanner: React.FC = () => {
  const { info, dismiss } = useUpdateCheck();
  if (!info) return null;

  const handleDownload = () => {
    void openInSystemBrowser(info.downloadUrl);
  };

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-indigo-600 text-white text-sm">
      <span>
        NoteNirman v{info.latestVersion} is available.
      </span>
      <button
        onClick={handleDownload}
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Download update
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss update notice"
        className="ml-1 opacity-80 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
};

export default UpdateBanner;
