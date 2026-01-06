
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';

const testimonials = [
  {
    quote: "The AI assistant is a game-changer for my productivity. I can draft, refine, and summarize my thoughts faster than ever before. Note Saver has become indispensable.",
    name: 'Aisha Khan',
    title: 'Software Developer',
    avatar: '/avatars/aisha.jpg',
  },
  {
    quote: "I love the seasonal themes! It's a small touch, but it makes the app feel so much more personal and enjoyable to use every day. The organization tools are top-notch too.",
    name: 'Ben Carter',
    title: 'UX Designer',
    avatar: '/avatars/ben.jpg',
  },
  {
    quote: "Finally, a note-taking app that is both powerful and beautiful. The tagging system is incredibly flexible, and the overall design is just a joy to look at.",
    name: 'Carlos Rodriguez',
    title: 'Freelance Writer',
    avatar: '/avatars/carlos.jpg',
  },
];

const Testimonials: React.FC = () => {
  const { colors } = useSeason();
  const cardVariants: any = {
    offscreen: { y: 50, opacity: 0 },
    onscreen: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: i * 0.1,
      },
    }),
  };

  return (
    <div className={`py-16 md:py-24 ${colors.bgSimple}`}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={`text-3xl md:text-4xl font-bold font-serif text-center mb-4 ${colors.primaryText}`}>Loved by Creatives & Professionals</h2>
          <p className={`max-w-2xl mx-auto text-center text-lg ${colors.secondaryText} mb-12`}>
            Don't just take our word for it. Here's what people are saying about Note Saver.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              custom={index}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
              className={`p-8 rounded-2xl border flex flex-col ${colors.surface} ${colors.border}`}
            >
              <p className={`flex-1 mb-6 ${colors.primaryText}`}>"{testimonial.quote}"</p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0 mr-4">
                  {/* <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full rounded-full object-cover" /> */}
                </div>
                <div>
                  <p className={`font-bold ${colors.primaryText}`}>{testimonial.name}</p>
                  <p className={`text-sm ${colors.secondaryText}`}>{testimonial.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;