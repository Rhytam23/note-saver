import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const colors = ['#FF4500', '#FFD700', '#C71585', '#00FA9A', '#00CED1'];

const NavratriIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    const decorations = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        rotate: (i * 30),
        color: colors[i % colors.length]
    })), []);

    return (
        <motion.div
            key="navratri-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#2E0219]"
        >
            <motion.div
                className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
                {decorations.map((d) => (
                    <div
                        key={d.id}
                        className="absolute w-[80vmax] h-[4px] origin-center"
                        style={{
                            backgroundColor: d.color,
                            transform: `rotate(${d.rotate}deg)`
                        }}
                    />
                ))}
            </motion.div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "backOut" }}
                className="z-10 text-center flex flex-col items-center"
            >
                <div className="flex justify-center items-center gap-4 mb-6 relative">
                    <motion.div
                        animate={{ rotate: [0, -15, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        className="text-7xl md:text-9xl origin-bottom-right"
                    >
                        🥢
                    </motion.div>
                    <motion.div
                        animate={{ rotate: [0, 15, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        className="text-7xl md:text-9xl origin-bottom-left transform scale-x-[-1]"
                    >
                        🥢
                    </motion.div>

                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.25, repeat: Infinity }}
                    >
                        💥
                    </motion.div>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 drop-shadow-md">
                    Happy Navratri
                </h1>
                <p className="text-xl text-pink-200 mt-4 font-medium tracking-wide">
                    Celebrate the triumph of good over evil 🔱
                </p>
            </motion.div>
        </motion.div>
    );
};

export default NavratriIntroAnimation;
