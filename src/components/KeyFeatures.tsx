
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { SparklesIcon, PaletteIcon, TagIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

const features = [
  {
    icon: <SparklesIcon className="h-8 w-8 text-accent" />,
    title: 'AI-Powered Assistance',
    description: 'Enhance your writing with summaries, proofreading, and idea generation powered by Gemini.',
  },
  {
    icon: <TagIcon className="h-8 w-8 text-accent" />,
    title: 'Flexible Organization',
    description: 'Organize your notes with custom tags, priorities, and pins for quick and easy access.',
  },
  {
    icon: <PaletteIcon className="h-8 w-8 text-accent" />,
    title: 'Dynamic Seasonal Themes',
    description: 'Experience a user interface that subtly changes with the seasons, keeping your workspace fresh.',
  },
];

const KeyFeatures: React.FC = () => {
  const { colors } = useSeason();
  const cardVariants: any = {
    offscreen: {
      y: 50,
      opacity: 0,
    },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        bounce: 0.4,
        duration: 0.8,
      },
    },
  };

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`text-3xl md:text-4xl font-bold font-serif text-center mb-4 ${colors.primaryText}`}>Everything You Need to Think Clearly</h2>
          <p className={`max-w-2xl mx-auto text-center text-lg ${colors.secondaryText} mb-12`}>
            Note Saver isn't just a digital notebook; it's a tool to enhance your focus and creativity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
              transition={{ delay: index * 0.1 }}
              className={`p-8 rounded-2xl border text-center transition-shadow duration-300 hover:shadow-2xl hover:border-accent/30 ${colors.bgSimple} ${colors.border}`}
            >
              <div className={`inline-flex p-4 rounded-full mb-6 bg-accent/10`}>
                {feature.icon}
              </div>
              <h3 className={`text-xl font-bold mb-2 ${colors.primaryText}`}>{feature.title}</h3>
              <p className={colors.secondaryText}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyFeatures;