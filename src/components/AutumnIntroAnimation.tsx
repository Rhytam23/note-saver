import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const AutumnIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const leaves = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        char: Math.random() > 0.5 ? '🍂' : '🍁',
        left: `${random(0, 100)}%`,
        delay: random(0, 4),
        duration: random(3, 6),
        rotation: random(0, 360)
    })), []);

    return (
        <motion.div
            key="autumn-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 to-amber-200 dark:from-orange-900 dark:to-amber-950"
        >
            {leaves.map(leaf => (
                <motion.div
                    key={leaf.id}
                    initial={{ y: -50, opacity: 0, rotate: 0 }}
                    animate={{
                        y: '110vh',
                        opacity: [0, 1, 1, 0],
                        rotate: leaf.rotation + 360,
                        x: [0, 50, -50, 20]
                    }}
                    transition={{
                        duration: leaf.duration,
                        delay: leaf.delay,
                        ease: "linear",
                        repeat: Infinity
                    }}
                    className="absolute text-4xl"
                    style={{ left: leaf.left }}
                >
                    {leaf.char}
                </motion.div>
            ))}

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2 }}
                className="text-center z-10 p-8 rounded-xl bg-white/30 backdrop-blur-md border border-white/20 shadow-xl dark:bg-black/30"
            >
                <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2 text-amber-900 dark:text-amber-100">Autumn Breeze</h1>
                <p className="text-lg text-amber-800 dark:text-amber-200">Cozy thoughts and fallen leaves 🍂</p>
            </motion.div>
        </motion.div>
    );
};

export default AutumnIntroAnimation;
