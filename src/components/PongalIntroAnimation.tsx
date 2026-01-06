import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const PongalIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <motion.div
            key="pongal-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-yellow-100 via-orange-100 to-yellow-200"
        >
            {/* Background Sun Rays */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-[150vmax] h-[150vmax] bg-[conic-gradient(from_0deg,transparent_0deg,orange_20deg,transparent_40deg,transparent_360deg)]"
                />
            </div>

            {/* Sugarcane Stalks */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1 }}
                className="absolute left-[10%] bottom-0 text-9xl transform -rotate-12 opacity-80"
            >
                🎋
            </motion.div>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute right-[10%] bottom-0 text-9xl transform rotate-12 opacity-80"
            >
                🎋
            </motion.div>

            {/* Main Pot Content */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, type: "spring" }}
                className="z-10 flex flex-col items-center text-center p-8"
            >
                <div className="relative text-8xl md:text-9xl mb-4">
                    🍯
                    <motion.div
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl"
                        animate={{ y: [-10, -20, -10], opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        ✨
                    </motion.div>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold text-orange-800 font-serif mb-2 drop-shadow-sm">
                    Happy Pongal
                </h1>
                <p className="text-xl text-orange-700 font-medium">Overflowing with joy and prosperity 🌾</p>
            </motion.div>
        </motion.div>
    );
};

export default PongalIntroAnimation;
