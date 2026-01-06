
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { CheckCircleIcon } from './Icons';

const reasons = [
  {
    title: 'Crafted Atmosphere',
    description: 'We follow the rhythm of your life with seasonal themes like Diwali, Christmas, and Monsoon. Writing feels personal again.',
  },
  {
    title: 'Visual Organization',
    description: 'With Cover Images and Tags, your notes aren\'t just text—they are beautiful visual cards. Simple, fast, and inspiring.',
  },
  {
    title: 'Local-First & Private',
    description: 'Your data is yours. It works offline instantly and syncs to the cloud only when you say so. No waiting, no tracking.',
  },
  {
    title: 'Integrated AI',
    description: 'The Gemini Assistant acts as a co-writer, not a chatbot. Summarize ideas or proofread text directly in the editor.',
  },
];

const WhyChooseUs: React.FC = () => {
  const { colors } = useSeason();

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' },
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
          <h2 className={`text-3xl md:text-4xl font-bold font-serif text-center mb-4 ${colors.primaryText}`}>Why Note Saver?</h2>
          <p className={`max-w-2xl mx-auto text-center text-lg ${colors.secondaryText} mb-12`}>
            In a world of complex apps, we focus on simplicity, beauty, and intelligence to create the best note-taking experience.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {reasons.map((reason) => (
            <motion.div
              key={reason.title}
              variants={itemVariants}
              className={`p-6 rounded-xl border ${colors.bgSimple} ${colors.border}`}
            >
              <CheckCircleIcon className="h-7 w-7 text-success mb-4" />
              <h3 className={`font-bold text-lg mb-2 ${colors.primaryText}`}>{reason.title}</h3>
              <p className={`${colors.secondaryText} text-sm`}>{reason.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default WhyChooseUs;
