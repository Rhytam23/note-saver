import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SummerIntroAnimationProps {
    onAnimationComplete: () => void;
}

const SummerIntroAnimation: React.FC<SummerIntroAnimationProps> = ({ onAnimationComplete }) => {
    // This timer reliably triggers the exit after 6 seconds.
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    return (
        <motion.div
            key="summer-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-end overflow-hidden"
            style={{ background: '#aee1f9' }}
        >
            {/* Sun */}
            <motion.div
                initial={{ y: '50%' }}
                animate={{ y: '-150%' }}
                transition={{ duration: 6, ease: 'easeOut' }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40vmin] h-[40vmin] rounded-full"
                style={{
                    background: 'radial-gradient(circle, #FFD75E, #FF7F50)',
                    boxShadow: '0 0 80px 40px rgba(255, 215, 94, 0.7)'
                }}
            />

            {/* Title & Tagline */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 3 }}
                className="absolute top-[25%] text-center"
            >
                <h1 className="text-4xl md:text-6xl font-mono font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    Note Saver
                </h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5, duration: 1.5 }}
                    className={`text-md md:text-lg font-semibold mt-2 text-white/90`}>
                    Capture your ideas under the summer sky ☀️
                </motion.p>
            </motion.div>
        </motion.div>
    );
};

export default SummerIntroAnimation;