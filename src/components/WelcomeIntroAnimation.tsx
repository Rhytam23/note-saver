import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';

interface WelcomeIntroAnimationProps {
    onAnimationComplete: () => void;
}

const WelcomeIntroAnimation: React.FC<WelcomeIntroAnimationProps> = ({ onAnimationComplete }) => {
    const { colors } = useSeason();

    useEffect(() => {
        const timer = setTimeout(() => {
            onAnimationComplete();
        }, 4500); // Animation duration

        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <motion.div
            key="welcome-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${colors.bgSimple} overflow-hidden`}
        >
            <div className="relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex items-center justify-center mb-6"
                >
                    <span className="text-6xl md:text-8xl" role="img" aria-label="lamp">🪔</span>
                </motion.div>

                <div className={`text-4xl md:text-6xl font-serif font-bold text-center ${colors.primaryText}`}>
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="block mb-2"
                    >
                        Welcome to
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.5, duration: 0.8, type: "spring", stiffness: 100 }}
                        className="block text-accent"
                    >
                        Notenirman
                    </motion.span>
                </div>

                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 2.2, duration: 1.5, ease: "easeInOut" }}
                    className="h-1 bg-accent mt-8 mx-auto rounded-full"
                    style={{ maxWidth: '200px' }}
                />
            </div>
        </motion.div>
    );
};

export default WelcomeIntroAnimation;
