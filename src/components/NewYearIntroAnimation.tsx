import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Sparkle Component for the celebration
const Sparkle = ({ delay }: { delay: number }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            y: [0, -100 + Math.random() * 200],
            x: [0, -100 + Math.random() * 200],
            rotate: [0, 180]
        }}
        transition={{ duration: 2, delay: delay, ease: "easeOut" }}
        className="absolute w-2 h-2 bg-yellow-200 rounded-full shadow-[0_0_10px_2px_rgba(253,224,71,0.5)]"
        style={{
            top: `${50 + (Math.random() - 0.5) * 60}%`,
            left: `${50 + (Math.random() - 0.5) * 60}%`
        }}
    />
);

interface NewYearIntroAnimationProps {
    onAnimationComplete: () => void;
}

const NewYearIntroAnimation: React.FC<NewYearIntroAnimationProps> = ({ onAnimationComplete }) => {
    const [stage, setStage] = useState<'countdown-1' | 'countdown-2' | 'countdown-3' | 'celebration'>('countdown-1');

    useEffect(() => {
        // Timeline:
        // 0s: Start (11:59:58)
        // 1s: 11:59:59
        // 2s: 12:00:00 (Celebration start)
        // 6s: End

        const timer1 = setTimeout(() => setStage('countdown-2'), 1000);
        const timer2 = setTimeout(() => setStage('countdown-3'), 2000); // This is 12:00:00
        const timer3 = setTimeout(() => setStage('celebration'), 2000); // Sync celebration trigger
        const timerEnd = setTimeout(onAnimationComplete, 6500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timerEnd);
        };
    }, [onAnimationComplete]);

    // Generate random sparkles
    const sparkles = Array.from({ length: 40 }).map((_, i) => (
        <Sparkle key={i} delay={Math.random() * 0.5} />
    ));

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
        >
            <AnimatePresence mode='wait'>
                {stage !== 'celebration' && (
                    <motion.div
                        key="clock"
                        className="text-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="font-mono text-4xl sm:text-6xl md:text-8xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
                            {stage === 'countdown-1' && "11:59:58 PM"}
                            {stage === 'countdown-2' && "11:59:59 PM"}
                            {stage === 'countdown-3' && "12:00:00 AM"}
                        </div>
                        <motion.div
                            className="mt-4 text-slate-400 text-lg sm:text-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Waiting for the moment...
                        </motion.div>
                    </motion.div>
                )}

                {stage === 'celebration' && (
                    <motion.div
                        key="celebration"
                        className="relative flex flex-col items-center justify-center w-full h-full"
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {sparkles}
                        </div>

                        {/* Main Text */}
                        <motion.h1
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 10 }}
                            className="text-5xl sm:text-7xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-[0_0_25px_rgba(234,179,8,0.6)] text-center px-4"
                        >
                            HAPPY NEW YEAR!
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="mt-8 text-xl sm:text-2xl text-cyan-100 max-w-2xl text-center px-6 leading-relaxed font-light"
                        >
                            "Time to start a new chapter. Embrace the magic of new beginnings."
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2, duration: 1.5 }}
                            className="absolute bottom-20 text-sm text-slate-500 font-mono"
                        >
                            Welcome to 2026
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default NewYearIntroAnimation;
