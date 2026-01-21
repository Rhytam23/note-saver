import React from 'react';
import { PlusIcon } from './Icons';
import { motion, Variants } from 'framer-motion';

interface FloatingActionButtonProps {
  onClick: () => void;
}

const fabVariants: any = {
  hidden: { scale: 0, y: 50 },
  visible: { scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 15, delay: 0.5 } }
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <motion.button
      id="tour-add-note-fab"
      variants={fabVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.1, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-gradient-to-r from-accent to-accent-dark text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center z-30 transition-shadow duration-300 hover:shadow-glow-accent"
      aria-label="Add new note"
    >
      <PlusIcon className="h-8 w-8" />
    </motion.button>
  );
};

export default FloatingActionButton;