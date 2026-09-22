import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const MonsoonIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const raindrops = useMemo(() => Array.from({ length: 200 }).map((_, i) => ({
        id: i,
        left: `${random(0, 100)}%`,
        delay: random(0, 2),
        duration: random(0.3, 0.7),
        height: random(15, 30),
        opacity: random(0.3, 0.8)
    })), []);

    return (
        <motion.div
            key="monsoon-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-slate-900"
        >
            <div className="absolute inset-0 pointer-events-none">
                {raindrops.map(drop => (
                    <div
                        key={drop.id}
                        className="absolute bg-blue-300 w-[2px]"
                        style={{
                            left: drop.left,
                            top: '-30px',
                            height: `${drop.height}px`,
                            opacity: drop.opacity,
                            boxShadow: '0 0 4px rgba(147, 197, 253, 0.5)',
                            animation: `rain-fall ${drop.duration}s linear infinite`,
                            animationDelay: `${drop.delay}s`
                        }}
                    />
                ))}
            </div>

            <div className="absolute inset-0 bg-white opacity-0 animate-[lightning-flash_4s_infinite_ease-out]" />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="mb-8 z-10 text-8xl"
            >
                ⛈️
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="text-center z-10 text-white"
            >
                <h1 className="text-4xl md:text-6xl font-mono font-bold mb-2">Monsoon Season</h1>
                <p className="text-lg text-blue-200">Let the rhythm of rain inspire you 🌧️</p>
            </motion.div>
        </motion.div>
    );
};

export default MonsoonIntroAnimation;
