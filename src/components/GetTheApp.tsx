import React from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import { WindowsIcon, AndroidIcon } from './Icons';

type PlatformKey = 'windows' | 'android';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  detail: string;
  icon: React.ReactNode;
  installNote: string;
  // Direct, same-origin download path. null means no build is published yet.
  downloadUrl: string | null;
  version: string;
}

const platforms: PlatformDef[] = [
  {
    key: 'windows',
    label: 'Windows',
    detail: 'Installer (.exe), 64-bit',
    icon: <WindowsIcon className="h-7 w-7" />,
    installNote: 'If Windows SmartScreen appears, choose More info, then Run anyway. The installer is not code-signed yet.',
    downloadUrl: '/downloads/NoteNirman-Setup.exe',
    version: '0.1.0',
  },
  {
    key: 'android',
    label: 'Android',
    detail: 'APK',
    icon: <AndroidIcon className="h-7 w-7" />,
    installNote: 'Open the file after it downloads. Android will ask you to allow installs from your browser or Files app, since this APK is not from the Play Store.',
    downloadUrl: null,
    version: '0.1.0',
  },
];

interface GetTheAppProps {
  accent: string;
  onOpenWebApp: () => void;
}

const GetTheApp: React.FC<GetTheAppProps> = ({ accent, onOpenWebApp }) => {
  const { colors } = useSeason();

  return (
    <section id="get-the-app" className={`border-t ${colors.border} ${colors.surface}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h2 className={`text-3xl sm:text-4xl font-serif font-bold tracking-tight ${colors.primaryText}`}>
            Use it where you work
          </h2>
          <p className={`mt-4 text-lg ${colors.secondaryText}`}>
            The web app and the installed apps share the same account, so a note started on your phone is waiting on your desktop.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {platforms.map(platform => (
            <div key={platform.key} className={`flex flex-col p-6 rounded-lg border ${colors.border} ${colors.bgSimple}`}>
              <div className="flex items-center gap-3" style={{ color: accent }}>
                {platform.icon}
                <div className={colors.primaryText}>
                  <h3 className="font-semibold leading-tight">{platform.label}</h3>
                  <p className={`text-sm ${colors.secondaryText}`}>{platform.detail} · v{platform.version}</p>
                </div>
              </div>
              <p className={`mt-4 text-sm leading-relaxed flex-1 ${colors.secondaryText}`}>{platform.installNote}</p>
              {platform.downloadUrl ? (
                <a
                  href={platform.downloadUrl}
                  download
                  className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-semibold text-gray-950 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  {`Download for ${platform.label}`}
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className={`mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-semibold border ${colors.border} ${colors.secondaryText} cursor-not-allowed`}
                >
                  Coming soon
                </span>
              )}
            </div>
          ))}

          <div className={`flex flex-col p-6 rounded-lg border ${colors.border} ${colors.bgSimple}`}>
            <div className={colors.primaryText}>
              <h3 className="font-semibold leading-tight">Web</h3>
              <p className={`text-sm ${colors.secondaryText}`}>Nothing to install</p>
            </div>
            <p className={`mt-4 text-sm leading-relaxed flex-1 ${colors.secondaryText}`}>
              Works in any current browser and opens offline after your first visit. Sign in with email or Google.
            </p>
            <button
              onClick={onOpenWebApp}
              className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-semibold border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              Open the web app
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GetTheApp;
