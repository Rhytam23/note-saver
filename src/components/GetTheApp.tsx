import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { WindowsIcon, AndroidIcon } from './Icons';

const REPO = 'Rhytam23/note-saver';
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_LIST_API = `https://api.github.com/repos/${REPO}/releases`;
const FALLBACK_RELEASES_URL = `https://github.com/${REPO}/releases`;

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

  useEffect(() => {
    let cancelled = false;

    const fetchReleaseInfo = async () => {
      try {
        let data: { assets?: { name: string; browser_download_url: string }[] } | null = null;
        
        // Try latest release API first
        const res = await fetch(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (res.ok) {
          data = await res.json();
        } else {
          // Fallback to releases list API if latest endpoint returns 404
          const listRes = await fetch(RELEASES_LIST_API, { headers: { Accept: 'application/vnd.github+json' } });
          if (listRes.ok) {
            const listData = await listRes.json();
            if (Array.isArray(listData) && listData.length > 0) {
              data = listData[0];
            }
          }
        }

        if (cancelled) return;

        const resolved: Partial<Record<PlatformKey, string>> = {};
        if (data && Array.isArray(data.assets)) {
          for (const platform of platforms) {
            const asset = data.assets.find((a) => platform.match(a.name));
            if (asset?.browser_download_url) {
              resolved[platform.key] = asset.browser_download_url;
            }
          }
        }
        setDownloadUrls(resolved);
      } catch {
        // Ignore fetch error; fallback URL handles seamless navigation
      }
    };

    fetchReleaseInfo();

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
            const directUrl = downloadUrls[platform.key];
            const href = directUrl || FALLBACK_RELEASES_URL;
            const isDirect = Boolean(directUrl);

            return (
              <motion.div
                key={platform.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`flex flex-col items-center text-center p-8 rounded-2xl border ${colors.bgSimple} ${colors.border} transition-shadow duration-300 hover:shadow-xl`}
              >
                <div className="mb-4 inline-flex p-4 rounded-full bg-accent/10">{platform.icon}</div>
                <h3 className={`text-lg font-bold tracking-wide ${colors.primaryText}`}>{platform.label}</h3>
                <p className={`text-sm mb-6 ${colors.secondaryText}`}>{platform.sublabel}</p>
                <motion.a
                  href={href}
                  target={isDirect ? undefined : "_blank"}
                  rel={isDirect ? undefined : "noopener noreferrer"}
                  download={isDirect ? true : undefined}
                  aria-label={`Download Notenirman for ${platform.label}`}
                  title={isDirect ? `Download ${platform.label} installer` : `Get ${platform.label} build on GitHub Releases`}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-3 rounded-full font-bold text-sm tracking-wide transition-all bg-accent text-primary-bg hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 shadow-md hover:bg-accent/90"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" />
                  </svg>
                  <span>DOWNLOAD</span>
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

