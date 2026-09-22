import React from 'react';
import { motion } from 'framer-motion';
import { HERO_THEMES, type SeasonalThemeMode } from './HeroProductPreview';
import { useMotionCapability } from '../hooks/useMotionCapability';

export interface SeasonalCardStackProps {
  activeSeason: SeasonalThemeMode;
}

interface CardLayout {
  rotateZ: number;
  translateZ: number;
  x: number;
  y: number;
}

// Back-to-front resting layout, and a slightly more "fanned" version used
// on hover. Hand-tuned rather than computed - there are only ever 3 cards.
const REST_LAYOUT: CardLayout[] = [
  { rotateZ: -8, translateZ: -30, x: -14, y: 6 },
  { rotateZ: 4, translateZ: 0, x: 6, y: 2 },
  { rotateZ: -1, translateZ: 30, x: 0, y: -4 },
];

const FAN_LAYOUT: CardLayout[] = [
  { rotateZ: -14, translateZ: -30, x: -28, y: 10 },
  { rotateZ: 7, translateZ: 0, x: 14, y: 2 },
  { rotateZ: -2, translateZ: 30, x: 0, y: -10 },
];

function layoutStyle(layout: CardLayout) {
  return {
    x: layout.x,
    y: layout.y,
    rotateZ: layout.rotateZ,
    translateZ: layout.translateZ,
  };
}

/**
 * A small CSS-3D "note stack" - three layered cards, seasonally coloured,
 * that settle into place on scroll and fan out slightly on hover. Pure CSS
 * transforms (perspective / rotateZ / translateZ) via framer-motion, no new
 * dependency. Sits alongside the theme-preview swatches in LandingPage.tsx's
 * Themes section: "this is what a themed note looks like."
 */
export const SeasonalCardStack: React.FC<SeasonalCardStackProps> = ({ activeSeason }) => {
  const currentSeason = HERO_THEMES[activeSeason] || HERO_THEMES.autumn;
  const { tier } = useMotionCapability();

  const cards = [
    { tone: currentSeason.bookColors[0], rest: REST_LAYOUT[0], fan: FAN_LAYOUT[0], content: null },
    { tone: currentSeason.bookColors[1], rest: REST_LAYOUT[1], fan: FAN_LAYOUT[1], content: null },
    {
      tone: currentSeason.bookColors[2],
      rest: REST_LAYOUT[2],
      fan: FAN_LAYOUT[2],
      content: (
        <div className="p-3 text-[11px] leading-snug">
          <p className="font-semibold" style={{ color: currentSeason.accentHex }}>
            {currentSeason.themeLabel}
          </p>
          <p className="mt-1 text-gray-300 italic">&ldquo;{currentSeason.journalText}&rdquo;</p>
        </div>
      ),
    },
  ];

  // tier === 'off': fully static, no framer-motion involvement at all.
  if (tier === 'off') {
    return (
      <div className="relative w-full h-40 sm:h-48" style={{ perspective: 900 }} aria-hidden="true">
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {cards.map((card, i) => (
            <div
              key={i}
              className="absolute inset-x-8 top-4 h-28 sm:h-32 rounded-xl border border-black/10 shadow-lg"
              style={{
                backgroundColor: card.tone,
                transform: `translate(${card.rest.x}px, ${card.rest.y}px) rotateZ(${card.rest.rotateZ}deg) translateZ(${card.rest.translateZ}px)`,
              }}
            >
              {card.content}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canHover = tier === 'full';

  return (
    <motion.div
      className="relative w-full h-40 sm:h-48"
      style={{ perspective: 900 }}
      initial="hidden"
      whileHover={canHover ? 'fan' : undefined}
      aria-hidden="true"
    >
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {cards.map((card, i) => {
          // Each card gets its own variants object (rest/fan layouts differ
          // per card, so these can't be a single shared `custom`-driven fn).
          const variants = {
            hidden: { opacity: 0, y: 24, rotateZ: 0, translateZ: 0, x: 0 },
            rest: { opacity: 1, ...layoutStyle(card.rest), transition: { duration: 0.5 } },
            ...(canHover ? { fan: { opacity: 1, ...layoutStyle(card.fan), transition: { duration: 0.3 } } } : {}),
          };
          return (
            <motion.div
              key={i}
              className="absolute inset-x-8 top-4 h-28 sm:h-32 rounded-xl border border-black/10 shadow-lg"
              style={{ backgroundColor: card.tone }}
              variants={variants}
              whileInView="rest"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: (cards.length - 1 - i) * 0.12 }}
            >
              {card.content}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SeasonalCardStack;
