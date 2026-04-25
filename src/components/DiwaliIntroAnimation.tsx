import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface IntroAnimationProps {
    onAnimationComplete: () => void;
}

const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Firework Component
const Firework = ({ delay, left, top, color, scale }: { delay: number, left: string, top: string, color: string, scale: number }) => {
    // Particles for the explosion
    const particles = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        angle: (i * 30) * (Math.PI / 180), // Radial distribution
    })), []);

    return (
        <div className="absolute w-0 h-0" style={{ left, top }}>
            {/* Rocket trail/ascent (optional, skipping for pure burst focus) */}

            {/* Burst Particles */}
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                    animate={{
                        opacity: [1, 1, 0],
                        x: Math.cos(p.angle) * 100 * scale,
                        y: Math.sin(p.angle) * 100 * scale,
                        scale: [0, 1, 0.5]
                    }}
                    transition={{
                        duration: 1.5,
                        delay: delay,
                        ease: "easeOut",
                        times: [0, 0.2, 1]
                    }}
                    className="absolute rounded-full"
                    style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: color,
                        boxShadow: `0 0 10px 2px ${color}`,
                    }}
                />
            ))}

            {/* Flash Center */}
            <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 2, 0] }}
                transition={{ duration: 0.5, delay: delay }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white blur-md"
            />
        </div>
    );
};

const DiwaliIntroAnimation: React.FC<IntroAnimationProps> = ({ onAnimationComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onAnimationComplete, 6000);
        return () => clearTimeout(timer);
    }, [onAnimationComplete]);

    // Fireworks configuration
    const fireworks = useMemo(() => [
        { id: 1, left: '20%', top: '30%', color: '#FFD700', delay: 0.2, scale: 1.2 }, // Gold
        { id: 2, left: '80%', top: '40%', color: '#FF4500', delay: 0.8, scale: 1.5 }, // OrangeRed
        { id: 3, left: '50%', top: '20%', color: '#FFA500', delay: 1.5, scale: 2.0 }, // Orange (Big Center)
        { id: 4, left: '10%', top: '60%', color: '#FF69B4', delay: 2.2, scale: 1.0 }, // HotPink
        { id: 5, left: '90%', top: '50%', color: '#00FFFF', delay: 2.8, scale: 1.3 }, // Cyan
        { id: 6, left: '30%', top: '70%', color: '#ADFF2F', delay: 3.5, scale: 1.1 }, // GreenYellow
        { id: 7, left: '70%', top: '80%', color: '#FFD700', delay: 4.2, scale: 1.4 },
    ], []);

    return (
        <motion.div
            key="diwali-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0a1025] via-[#101935] to-[#1c1c1c]"
        >
            {/* Silhouetted Landscape (Bottom) */}
            <div className="absolute bottom-0 w-full h-[20vh] bg-black/40 z-0 opacity-80"
                style={{ borderRadius: '50% 50% 0 0 / 20% 20% 0 0', transform: 'scaleX(1.5)' }}
            />

            {/* Fireworks Container */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {fireworks.map(fw => (
                    <Firework key={fw.id} {...fw} />
                ))}
            </div>

            {/* Main Center Content */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 1.5, delay: 1, type: 'spring' }}
                className="z-20 flex flex-col items-center text-center p-8 backdrop-blur-sm rounded-3xl border border-white/10 bg-black/20"
            >
                <div className="text-8xl md:text-9xl mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] animate-pulse">
                    🪔
                </div>
                {/* Changed Icon to something less specific or just clearer text focus as per image which had less focus on emojis */}
                <h1 className="text-5xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_0_10px_rgba(255,165,0,0.5)] font-serif mb-2">
                    Happy Diwali
                </h1>
                <p className="text-lg md:text-2xl text-yellow-100 font-light tracking-widest uppercase">
                    Festival of Lights
                </p>
            </motion.div>
        </motion.div>
    );
};

export default DiwaliIntroAnimation;
