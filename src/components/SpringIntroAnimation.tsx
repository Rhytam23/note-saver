import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const SpringIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const petals = useMemo(() => Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        left: `${random(0, 100)}%`,
        delay: random(0, 3),
        duration: random(4, 8),
    })), []);

    return (
        <motion.div
            key="spring-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 to-green-100 dark:from-pink-950 dark:to-green-950"
        >
            {/* Falling Petals */}
            {petals.map(petal => (
                <motion.div
                    key={petal.id}
                    initial={{ y: -20, opacity: 0, rotate: 0 }}
                    animate={{
                        y: '100vh',
                        opacity: [0, 0.8, 0],
                        rotate: 360,
                        x: [0, 100, -50]
                    }}
                    transition={{
                        duration: petal.duration,
                        delay: petal.delay,
                        ease: "easeOut",
                        repeat: Infinity
                    }}
                    className="absolute text-xl text-pink-400"
                    style={{ left: petal.left }}
                >
                    🌸
                </motion.div>
            ))}

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className="text-center z-10"
            >
                <div className="text-8xl mb-4 animate-bounce" style={{ animationDuration: '3s' }}>🌷</div>
                <h1 className="text-4xl md:text-6xl font-serif font-bold mb-2 text-pink-700 dark:text-pink-300">Spring Awakening</h1>
                <p className="text-lg text-green-700 dark:text-green-300">New beginnings, fresh ideas 🌱</p>
            </motion.div>
        </motion.div>
    );
};

export default SpringIntroAnimation;
