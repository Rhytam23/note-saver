import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { NoteNirmanLogo } from './NoteNirmanLogo';

interface WelcomeIntroAnimationProps {
    onAnimationComplete: () => void;
}

const WelcomeIntroAnimation: React.FC<WelcomeIntroAnimationProps> = ({ onAnimationComplete }) => {
    const { colors } = useSeason();

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            onAnimationComplete();
            return;
        }

        const timer = setTimeout(() => {
            onAnimationComplete();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <motion.div
            key="welcome-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onAnimationComplete}
            title="Click or tap to skip"
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${colors.bgSimple} overflow-hidden cursor-pointer select-none`}
        >
            <div className="relative pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex items-center justify-center mb-4"
                >
                    <NoteNirmanLogo size="xl" />
                </motion.div>

                <div className={`text-4xl md:text-6xl font-serif font-bold text-center ${colors.primaryText}`}>
                    <motion.span
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="block mb-2 text-2xl md:text-3xl font-mono text-secondary-text"
                    >
                        Welcome to
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.5, type: "spring", stiffness: 120 }}
                        className="block text-accent"
                    >
                        Notenirman
                    </motion.span>
                </div>

                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.9, duration: 1.2, ease: "easeInOut" }}
                    className="h-1 bg-accent mt-6 mx-auto rounded-full"
                    style={{ maxWidth: '180px' }}
                />

                <p className="text-[10px] text-center text-secondary-text opacity-50 mt-4">
                  Tap anywhere to skip
                </p>
            </div>
        </motion.div>
    );
};

export default WelcomeIntroAnimation;
