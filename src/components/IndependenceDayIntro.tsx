import React from 'react';
import { motion } from 'framer-motion';
import { AshokaChakraIcon } from './Icons';
import { useSeason } from '../contexts/SeasonalContext';

interface IndependenceDayIntroProps {
    onAnimationComplete: () => void;
}

const IndependenceDayIntro: React.FC<IndependenceDayIntroProps> = ({ onAnimationComplete }) => {
    const { colors } = useSeason();

    return (
        <motion.div
            key="independence-day-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1, delay: 6 } }}
            onAnimationComplete={onAnimationComplete}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
            style={{
                background: 'linear-gradient(to bottom, #FF9933 25%, #FFFFFF 50%, #138808 75%)',
            }}
        >
            {/* Centered Ashoka Chakra */}
            <motion.div
                initial={{ opacity: 0, scale: 0.1, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute"
            >
                <AshokaChakraIcon
                    className="w-[60vmin] h-[60vmin] text-[#000080]"
                    style={{ animation: `ashoka-chakra-rotate 20s linear infinite` }}
                />
            </motion.div>

            {/* Title & Tagline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, delay: 3.5 }}
                className="absolute bottom-8 md:bottom-12 text-center"
            >
                <h1 className="text-3xl md:text-5xl font-mono font-bold text-[#000080]" style={{ textShadow: '0 2px 5px rgba(255,255,255,0.8)' }}>
                    Notenirman
                </h1>
                <p className={`text-md md:text-lg font-semibold mt-2 text-green-800`}>
                    Proudly Made in India 🇮🇳
                </p>
            </motion.div>
        </motion.div>
    );
};

export default IndependenceDayIntro;
