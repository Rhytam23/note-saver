
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { SparklesIcon, EyeIcon, TagIcon } from './Icons';

const features = [
  {
    icon: <SparklesIcon className="h-8 w-8 text-accent" />,
    title: 'Seamlessly Integrated AI',
    description: 'Go beyond simple notes. Summarize long texts, proofread your writing for errors, and brainstorm new ideas directly within your editor. Our Gemini-powered assistant is your creative partner.',
    image: '/features/ai-mockup.png',
  },
  {
    icon: <TagIcon className="h-8 w-8 text-accent" />,
    title: 'Powerful, Visual Organization',
    description: 'Don\'t just tag your notes—make them your own. Assign unique colors and image icons to your tags for a fast, visual way to find what you need. Filter by tags, priority, or search terms with ease.',
    image: '/features/tags-mockup.png',
  },
  {
    icon: <EyeIcon className="h-8 w-8 text-accent" />,
    title: 'A Joyful, Focused Interface',
    description: 'We believe your tools should be a delight to use. Enjoy a clean, uncluttered interface that adapts to your system\'s dark or light mode, and subtly changes with the seasons to provide a fresh, inspiring workspace.',
    image: '/features/ui-mockup.png',
  },
];

const FeatureHighlights: React.FC = () => {
  const { colors } = useSeason();

  const textVariants: any = {
    offscreen: { x: -50, opacity: 0 },
    onscreen: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    },
  };

  const imageVariants: any = {
    offscreen: { x: 50, opacity: 0 },
    onscreen: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 20 },
    },
  };

  return (
    <div className={`py-16 md:py-24 ${colors.surface}`}>
      <div className="container mx-auto px-4 space-y-20">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.4 }}
            className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center`}
          >
            <motion.div
              variants={textVariants}
              className={`${index % 2 === 1 ? 'md:order-2' : ''}`}
            >
              <div className={`inline-flex p-3 rounded-full mb-4 bg-accent/10`}>
                {feature.icon}
              </div>
              <h3 className={`text-2xl md:text-3xl font-bold font-serif mb-4 ${colors.primaryText}`}>{feature.title}</h3>
              <p className={`${colors.secondaryText} text-lg`}>{feature.description}</p>
            </motion.div>
            <motion.div
              variants={imageVariants}
              className={`${index % 2 === 1 ? 'md:order-1' : ''}`}
            >
              <div className={`rounded-xl shadow-lg border p-2 ${colors.border} ${colors.bgSimple}`}>
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FeatureHighlights;
