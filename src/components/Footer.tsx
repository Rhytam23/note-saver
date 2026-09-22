import React from 'react';
import { motion } from 'framer-motion';
import { GitHubIcon, BuyMeACoffeeIcon, PayPalIcon, InstagramIcon, MailIcon, DiyaIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

import { useRouter } from '../contexts/RouterContext';

interface FooterProps {
    variant?: 'simple' | 'detailed';
    onPrivacyClick?: () => void;
    onTermsClick?: () => void;
    onFAQClick?: () => void;
}

const socialLinks = [
  { href: 'https://github.com/Rhytam23', label: 'GitHub', icon: <GitHubIcon className="h-6 w-6" /> },
  { href: 'https://www.buymeacoffee.com/2020sumoyi', label: 'Buy Me a Coffee', icon: <BuyMeACoffeeIcon className="h-6 w-6" /> },
  { href: 'https://paypal.me/rhhytam01', label: 'PayPal', icon: <PayPalIcon className="h-6 w-6" /> },
  { href: 'https://www.instagram.com/i_am_rhytam', label: 'Instagram', icon: <InstagramIcon className="h-6 w-6" /> },
  { href: 'mailto:rhytambiswas@gmail.com', label: 'Email', icon: <MailIcon className="h-6 w-6" /> },
];

const Footer: React.FC<FooterProps> = ({ variant = 'simple', onPrivacyClick, onTermsClick, onFAQClick }) => {
  const { colors, theme } = useSeason();
  const { pushPath } = useRouter();
  const isSummer = theme === 'summer';
  const isNavratri = theme === 'navratri';

  if (variant === 'simple') {
    return (
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`w-full p-4 border-t ${colors.border} flex items-center justify-between transition-colors`}
      >
        <div className="flex items-center space-x-6">
            {socialLinks.map(link => (
                <a
                    key={link.label}
                    href={link.href}
                    target={link.label !== 'Email' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={`transition-colors duration-200 ${colors.secondaryText} hover:text-accent`}
                >
                    {link.icon}
                </a>
            ))}
        </div>
        <p className={`text-xs ${colors.secondaryText} opacity-60`}>
            © {new Date().getFullYear()} Notenirman
        </p>
      </motion.footer>
    );
  }

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`w-full border-t p-12 mt-20 ${colors.border} ${isSummer ? 'bg-orange-50/30' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 text-left">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">📄</span>
            <h2 className={`text-2xl font-bold font-mono ${colors.primaryText}`}>Notenirman</h2>
          </div>
          <p className={`text-sm ${colors.secondaryText} uppercase tracking-widest`}>Crafted for Thoughts</p>
          {isNavratri && <DiyaIcon className="h-8 w-8 text-amber-400" />}
        </div>

        <div className="space-y-4">
            <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.primaryText}`}>Explore</h3>
            <ul className={`space-y-2 text-sm ${colors.secondaryText}`}>
                <li><a href="#" className="hover:text-accent">Features</a></li>
                <li><a href="#" className="hover:text-accent">Smart Search</a></li>
                <li><a href="#" className="hover:text-accent">AI Assistance</a></li>
            </ul>
        </div>

        <div className="space-y-4">
            <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.primaryText}`}>Support</h3>
            <ul className={`space-y-2 text-sm ${colors.secondaryText}`}>
                <li><a
                    href="/support"
                    onClick={(e) => { e.preventDefault(); pushPath('/support'); }}
                    className="hover:text-accent"
                >Support Center</a></li>
                <li><a
                    href="/support"
                    onClick={(e) => { e.preventDefault(); if (onFAQClick) onFAQClick(); else pushPath('/support'); }}
                    className="hover:text-accent"
                >FAQs</a></li>
                <li><a
                    href="/cookies"
                    onClick={(e) => { e.preventDefault(); pushPath('/cookies'); }}
                    className="hover:text-accent"
                >Cookie Preferences</a></li>
            </ul>
        </div>

        <div className="space-y-4">
            <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.primaryText}`}>Legal</h3>
            <ul className={`space-y-2 text-sm ${colors.secondaryText}`}>
                <li><a
                    href="/privacy"
                    onClick={(e) => { e.preventDefault(); if (onPrivacyClick) onPrivacyClick(); else pushPath('/privacy'); }}
                    className="hover:text-accent"
                >Privacy Policy</a></li>
                <li><a
                    href="/terms"
                    onClick={(e) => { e.preventDefault(); if (onTermsClick) onTermsClick(); else pushPath('/terms'); }}
                    className="hover:text-accent"
                >Terms of Service</a></li>
                <li><a
                    href="/cookies"
                    onClick={(e) => { e.preventDefault(); pushPath('/cookies'); }}
                    className="hover:text-accent"
                >Cookie Preferences</a></li>
            </ul>
        </div>

        <div className="space-y-4">
            <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.primaryText}`}>Connect</h3>
            <div className="flex flex-wrap gap-4">
                {socialLinks.map(link => (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={`${colors.secondaryText} hover:text-accent`}>
                        {link.icon}
                    </a>
                ))}
            </div>
        </div>
      </div>

      <div className={`mt-12 pt-8 border-t ${colors.border} flex flex-col md:flex-row items-center justify-between gap-4`}>
          <p className={`text-xs ${colors.secondaryText} opacity-70 italic`}>
            "Designed to be beautiful, built to be smart."
          </p>
          <p className={`text-xs ${colors.secondaryText}`}>
            © {new Date().getFullYear()} Notenirman. All rights reserved.
          </p>
      </div>
    </motion.footer>
  );
};

export default Footer;
