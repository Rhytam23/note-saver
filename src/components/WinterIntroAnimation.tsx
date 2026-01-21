import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

interface WinterIntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const WinterIntroAnimation: React.FC<WinterIntroAnimationProps> = ({ onAnimationComplete }) => {
    const { theme } = useTheme() as any;
    const isDark = theme === 'dark';

    useEffect(() => {
        const timer = setTimeout(() => {
            if (onAnimationComplete) {
                onAnimationComplete();
            }
        }, 7000); // Total duration 7s
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <motion.div
            key="winter-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0, delay: 6.0 } }}
            className="fixed inset-0 z-[200] overflow-hidden"
        >
            {/* Background Sky - Cooler, more icy colors */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${isDark ? 'bg-[linear-gradient(180deg,#0f172a,#1e3a8a)]' : 'bg-[linear-gradient(180deg,#e0f2fe,#bae6fd)]'}`} />

            {/* Stars */}
            {isDark && (
                <div className="absolute inset-0">
                    {Array.from({ length: 70 }).map((_, i) => (
                        <div key={i} className="absolute bg-white rounded-full" style={{
                            top: `${random(0, 100)}%`, left: `${random(0, 100)}%`,
                            width: `${random(1, 2.5)}px`, height: `${random(1, 2.5)}px`,
                            opacity: random(0.5, 1),
                            animation: `icon-star-twinkle ${random(2, 4)}s infinite alternate`
                        }} />
                    ))}
                </div>
            )}

            {/* Snowfall */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 80 }).map((_, i) => ( // More snow for just winter
                    <motion.div
                        key={i}
                        className="absolute bg-white/90 rounded-full"
                        initial={{ y: '-10vh', opacity: 0 }}
                        animate={{ y: '110vh', opacity: 1, rotate: random(-360, 360) }}
                        transition={{ duration: random(5, 12), delay: random(0, 5), repeat: Infinity, ease: 'linear' }}
                        style={{
                            left: `${random(0, 100)}%`,
                            width: `${random(3, 6)}px`,
                            height: `${random(3, 6)}px`,
                        }}
                    />
                ))}
            </div>

            {/* Snowman Element (Simple CSS/SVG) */}
            {/* Snowman Element (Simple CSS/SVG) */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 1, type: 'spring' }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
                <div className="text-[12rem] md:text-[18rem] relative z-10 drop-shadow-lg -translate-y-[10%]">
                    ☃️
                </div>
            </motion.div>

            {/* Title & Tagline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, delay: 2.5 }}
                className={`absolute bottom-8 md:bottom-12 w-full text-center z-50 ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
                <h1 className="text-3xl md:text-5xl font-mono font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    Note Saver
                </h1>
                <p className="text-md md:text-lg font-semibold mt-2 opacity-90">
                    Winter chill, fresh thoughts ❄️
                </p>
            </motion.div>
        </motion.div>
    );
};

export default WinterIntroAnimation;
