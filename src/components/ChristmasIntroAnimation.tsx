import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SantaSleighIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface ChristmasIntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const ChristmasIntroAnimation: React.FC<ChristmasIntroAnimationProps> = ({ onAnimationComplete }) => {
    const { theme } = useTheme() as any;
    const isDark = theme === 'dark';

    useEffect(() => {
        const timer = setTimeout(() => {
            if (onAnimationComplete) {
                onAnimationComplete();
            }
        }, 11000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const sparkles = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: `${random(0, 100)}%`,
        top: `${random(0, 100)}%`,
        size: random(1, 3),
        delay: random(0, 1.5),
        duration: random(1, 2),
    })), []);

    return (
        <motion.div
            key="christmas-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0, delay: 10.0 } }}
            className="fixed inset-0 z-[200] overflow-hidden"
        >
            <div className={`absolute inset-0 transition-colors duration-1000 ${isDark ? 'bg-[linear-gradient(180deg,#0a1936,#1e2d4c)]' : 'bg-[linear-gradient(180deg,#f0f9ff,#dbeafe)]'}`} />

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

            <motion.div
                initial={{ x: '-30vw', y: '15vh' }}
                animate={{ x: '110vw', y: '10vh', transition: { duration: 5, delay: 0.5, ease: 'easeInOut' } }}
                className="absolute z-30"
            >
                <SantaSleighIcon className="w-48 h-auto text-red-600" style={{ filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.3))' }} />
                <div className="absolute top-0 left-0 w-full h-full">
                    {sparkles.map(s => (
                        <div key={s.id} className="absolute bg-yellow-300 rounded-full" style={{
                            left: s.left, top: s.top, width: s.size, height: s.size,
                            boxShadow: '0 0 8px #FFD700',
                            animation: `sparkle-trail ${s.duration}s ease-out infinite`,
                            animationDelay: `${s.delay}s`,
                        }} />
                    ))}
                </div>
            </motion.div>

            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 5.5, type: 'spring' }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
                <div className="text-[12rem] md:text-[18rem] drop-shadow-2xl filter brightness-110 -translate-y-[10%]">
                    🎄
                </div>
            </motion.div>

            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 50 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white/80 rounded-full"
                        initial={{ y: '-10vh', opacity: 0 }}
                        animate={{ y: '110vh', opacity: 1, rotate: random(-360, 360) }}
                        transition={{ duration: random(8, 15), delay: random(0, 7), repeat: Infinity, ease: 'linear' }}
                        style={{
                            left: `${random(0, 100)}%`,
                            width: `${random(4, 8)}px`,
                            height: `${random(4, 8)}px`,
                        }}
                    />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, delay: 6.5 }}
                className={`absolute bottom-8 md:bottom-12 w-full text-center z-50 ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
                <h1 className="text-3xl md:text-5xl font-mono font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    Notenirman
                </h1>
                <p className="text-md md:text-lg font-semibold mt-2 opacity-90">
                    Wishing you a magical and festive season! 🎄
                </p>
            </motion.div>
        </motion.div>
    );
};

export default ChristmasIntroAnimation;
