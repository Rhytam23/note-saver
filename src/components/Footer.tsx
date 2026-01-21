import React from 'react';
import { motion } from 'framer-motion';
import { GitHubIcon, BuyMeACoffeeIcon, PayPalIcon, InstagramIcon, MailIcon, DiyaIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

const socialLinks = [
  { href: 'https://github.com/Rhytam23', label: 'GitHub', icon: <GitHubIcon className="h-6 w-6" /> },
  { href: 'https://www.buymeacoffee.com/2020sumoyi', label: 'Buy Me a Coffee', icon: <BuyMeACoffeeIcon className="h-6 w-6" /> },
  { href: 'https://paypal.me/rhhytam01', label: 'PayPal', icon: <PayPalIcon className="h-6 w-6" /> },
  { href: 'https://www.instagram.com/i_am_rhytam', label: 'Instagram', icon: <InstagramIcon className="h-6 w-6" /> },
  { href: 'mailto:rhytambiswas@gmail.com', label: 'Email', icon: <MailIcon className="h-6 w-6" /> },
];

const Footer: React.FC = () => {
  const { colors, theme } = useSeason();
  const isSummer = theme === 'summer';
  const isNavratri = theme === 'navratri';

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className={`w-full backdrop-blur-sm border-t p-4 text-center text-sm ${colors.secondaryText} flex-shrink-0 ${colors.border}
        ${isSummer 
            ? 'bg-gradient-to-t from-orange-400/30 to-yellow-300/30 dark:from-orange-600/30 dark:to-blue-900/30 text-slate-700 dark:text-yellow-100' 
            : colors.bgOpacity80
        }
      `}
    >
      <div className="flex items-center justify-center gap-4">
        {isNavratri && (
            <DiyaIcon 
                className="h-8 w-8 text-amber-400" 
                style={{ animation: 'soft-flicker 3s infinite ease-in-out' }}
            />
        )}
        <p>Thank you for visiting! Connect with me:</p>
      </div>
      <div className="flex items-center justify-center space-x-6 mt-3">
        {socialLinks.map(link => (
          <a
            key={link.label}
            href={link.href}
            target={link.label !== 'Email' ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            className={`transition-colors duration-200 ${isSummer ? 'hover:text-white' : 'hover:text-accent'}`}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </motion.footer>
  );
};

export default Footer;