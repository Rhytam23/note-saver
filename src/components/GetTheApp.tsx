import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { WindowsIcon, AndroidIcon } from './Icons';

const REPO = 'Rhytam23/note-saver';
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

type PlatformKey = 'windows' | 'android';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  match: (assetName: string) => boolean;
}

const platforms: PlatformDef[] = [
  {
    key: 'windows',
    label: 'WINDOWS',
    sublabel: '.exe installer, 64-bit',
    icon: <WindowsIcon className="h-9 w-9 text-accent" />,
    match: (name) => name.toLowerCase().endsWith('.exe'),
  },
  {
    key: 'android',
    label: 'ANDROID',
    sublabel: '.apk',
    icon: <AndroidIcon className="h-9 w-9 text-accent" />,
    match: (name) => name.toLowerCase().endsWith('.apk'),
  },
];

const GetTheApp: React.FC = () => {
  const { colors } = useSeason();
  const [downloadUrls, setDownloadUrls] = useState<Partial<Record<PlatformKey, string>>>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;

    fetch(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
        return res.json();
      })
      .then((data: { assets?: { name: string; browser_download_url: string }[] }) => {
        if (cancelled) return;
        const assets = data.assets || [];
        const resolved: Partial<Record<PlatformKey, string>> = {};
        for (const platform of platforms) {
          const asset = assets.find((a) => platform.match(a.name));
          if (asset) resolved[platform.key] = asset.browser_download_url;
        }
        setDownloadUrls(resolved);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="get-the-app" className={`py-16 md:py-24 border-y ${colors.border} ${colors.surface}`}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`text-3xl md:text-4xl font-bold font-serif text-center mb-4 ${colors.primaryText}`}>
            Get the <span className="text-accent">App</span>
          </h2>
          <p className={`max-w-2xl mx-auto text-center text-lg ${colors.secondaryText} mb-12`}>
            Take Notenirman with you. Native apps for Windows and Android.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {platforms.map((platform, index) => {
            const url = downloadUrls[platform.key];
            const disabled = status !== 'ready' || !url;

            return (
              <motion.div
                key={platform.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`flex flex-col items-center text-center p-8 rounded-2xl border ${colors.bgSimple} ${colors.border}`}
              >
                <div className="mb-4 inline-flex p-4 rounded-full bg-accent/10">{platform.icon}</div>
                <h3 className={`text-lg font-bold tracking-wide ${colors.primaryText}`}>{platform.label}</h3>
                <p className={`text-sm mb-6 ${colors.secondaryText}`}>{platform.sublabel}</p>
                <motion.a
                  href={disabled ? undefined : url}
                  aria-disabled={disabled}
                  aria-label={`Download Notenirman for ${platform.label}`}
                  title={disabled ? 'Download will be available once release artifacts are published' : undefined}
                  onClick={(e) => {
                    if (disabled) e.preventDefault();
                  }}
                  whileHover={disabled ? undefined : { scale: 1.03 }}
                  whileTap={disabled ? undefined : { scale: 0.97 }}
                  className={`w-full py-2.5 rounded-full font-bold text-sm tracking-wide transition-all ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed bg-accent/40 text-primary-bg pointer-events-none'
                      : 'bg-accent text-primary-bg hover:shadow-lg cursor-pointer'
                  }`}
                >
                  DOWNLOAD
                </motion.a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default GetTheApp;
