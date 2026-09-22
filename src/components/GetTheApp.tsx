import React, { useEffect, useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { WindowsIcon, AndroidIcon } from './Icons';
import { useMotionCapability } from '../hooks/useMotionCapability';
import { useParallax } from '../hooks/useParallax';

type PlatformKey = 'windows' | 'android';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  detail: string;
  icon: React.ReactNode;
  installNote: string;
  // Direct, same-origin download path. Kept at a fixed filename - the
  // release pipeline overwrites it on every tagged release (see
  // .github/workflows/release.yml, "Publish Latest Downloads To Landing
  // Page"), so this link never needs to be hand-edited again.
  downloadUrl: string;
}

const platforms: PlatformDef[] = [
  {
    key: 'windows',
    label: 'Windows',
    detail: 'Installer (.exe), 64-bit',
    icon: <WindowsIcon className="h-7 w-7" />,
    installNote: 'If Windows SmartScreen appears, choose More info, then Run anyway. The installer is not code-signed yet.',
    downloadUrl: '/downloads/NoteNirman-Setup.exe',
  },
  {
    key: 'android',
    label: 'Android',
    detail: 'APK',
    icon: <AndroidIcon className="h-7 w-7" />,
    installNote: 'Open the file after it downloads. Android will ask you to allow installs from your browser or Files app, since this APK is not from the Play Store.',
    downloadUrl: '/downloads/NoteNirman.apk',
  },
];

interface VersionManifest {
  version: string;
}

/**
 * Reads the same version.json the release pipeline publishes and the
 * in-app update-check banner polls (see useUpdateCheck.ts), so the version
 * number shown here can never drift from what's actually downloadable.
 */
function useLatestVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/downloads/version.json')
      .then(res => (res.ok ? res.json() : null))
      .then((data: VersionManifest | null) => {
        if (!cancelled && data?.version) setVersion(data.version);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return version;
}

interface GetTheAppProps {
  accent: string;
  onOpenWebApp: () => void;
}

const GetTheApp: React.FC<GetTheAppProps> = ({ accent, onOpenWebApp }) => {
  const { colors } = useSeason();
  const { tier } = useMotionCapability();
  const latestVersion = useLatestVersion();

  // Gentle, staggered depth on the 3 cards as the grid scrolls into view -
  // card 0 barely moves, card 2 a little more. Three explicit calls (not a
  // hook-in-a-loop) since there are always exactly 3 cards here.
  const grid = useParallax(tier, [0, 1]); // range unused directly, just want the shared scrollYProgress + ref
  const cardY0 = useTransform(grid.scrollYProgress, [0, 1], tier === 'full' ? [0, 6] : [0, 0]);
  const cardY1 = useTransform(grid.scrollYProgress, [0, 1], tier === 'full' ? [0, 14] : [0, 0]);
  const cardY2 = useTransform(grid.scrollYProgress, [0, 1], tier === 'full' ? [0, 22] : [0, 0]);
  const cardParallax = [cardY0, cardY1, cardY2];

  return (
    <section id="get-the-app" className={`border-t ${colors.border} ${colors.surface}`}>
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <h2 className={`text-3xl sm:text-4xl font-serif font-bold tracking-tight ${colors.primaryText}`}>
            Use it where you work
          </h2>
          <p className={`mt-4 text-lg ${colors.secondaryText}`}>
            The web app and the installed apps share the same account, so a note started on your phone is waiting on your desktop.
          </p>
        </motion.div>

        <div ref={grid.ref} className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {platforms.map((platform, index) => (
            // Outer element carries the scroll-linked parallax `y`; the inner
            // motion.div keeps its own independent whileInView reveal `y` -
            // kept on separate elements so the two motion values don't fight.
            <motion.div key={platform.key} style={{ y: cardParallax[index] }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className={`flex flex-col p-6 rounded-lg border ${colors.border} ${colors.bgSimple}`}>
              <div className="flex items-center gap-3" style={{ color: accent }}>
                {platform.icon}
                <div className={colors.primaryText}>
                  <h3 className="font-semibold leading-tight">{platform.label}</h3>
                  <p className={`text-sm ${colors.secondaryText}`}>{platform.detail}{latestVersion ? ` · v${latestVersion}` : ''}</p>
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
            </motion.div>
            </motion.div>
          ))}

          <motion.div style={{ y: cardParallax[2] }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, delay: platforms.length * 0.08 }}
            className={`flex flex-col p-6 rounded-lg border ${colors.border} ${colors.bgSimple}`}
          >
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
          </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GetTheApp;
