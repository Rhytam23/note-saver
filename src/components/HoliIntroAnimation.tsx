import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;
const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const HoliIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const splashes = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: `${random(10, 90)}%`,
        top: `${random(10, 90)}%`,
        color: colors[Math.floor(random(0, colors.length))],
        scale: random(2, 6),
        delay: random(0, 2),
        rotation: random(0, 360)
    })), []);

    return (
        <motion.div
            key="holi-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-white"
        >
            {/* Color Splashes */}
            {splashes.map(splash => (
                <motion.div
                    key={splash.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: splash.scale, opacity: 0.8 }}
                    transition={{
                        duration: 0.8,
                        delay: splash.delay,
                        type: "spring",
                        stiffness: 200
                    }}
                    className="absolute rounded-full filter blur-xl mix-blend-multiply"
                    style={{
                        left: splash.left,
                        top: splash.top,
                        width: '100px',
                        height: '100px',
                        backgroundColor: splash.color,
                        transform: `translate(-50%, -50%) rotate(${splash.rotation}deg)`
                    }}
                />
            ))}

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 1 }}
                className="z-10 text-center p-8 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200 shadow-xl"
            >
                <div className="text-7xl md:text-9xl mb-4">
                    🎨
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 font-sans tracking-tight">
                    Happy Holi
                </h1>
                <p className="text-xl text-gray-600 font-semibold mt-2">
                    Let the colors of joy spread! 🌈
                </p>
            </motion.div>
        </motion.div>
    );
};

export default HoliIntroAnimation;
