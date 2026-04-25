import React, { useState, useEffect, useMemo } from 'react';
import { useSeason } from '../contexts/SeasonalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AshokaChakraIcon, LightningBoltIcon } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

// Helper to generate random values for animations
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Props for components that adapt to light/dark mode
interface ThemeProps {
    isDarkMode: boolean;
}

const WinterThemeBackground: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const snowFlakes = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        size: 6 + Math.random() * 10,
        duration: 8 + Math.random() * 8,
    })), []);

    const stars = useMemo(() => Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        width: Math.random() * 2 + 1,
        height: Math.random() * 2 + 1,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        opacity: 0.4 + Math.random() * 0.7,
    })), []);

    return (
        <div className={`w-full h-full overflow-hidden relative transition-colors duration-700 ${isDarkMode ? 'bg-[linear-gradient(180deg,#021428,#071936)]' : 'bg-[linear-gradient(180deg,#dbeffd,#f8fbff)]'}`}>
            {/* Aurora and Stars for Dark Mode */}
            {isDarkMode && (
                <>
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute inset-0 mix-blend-screen opacity-90">
                            <div className="absolute -top-40 left-1/4 w-[70%] h-56 rounded-full blur-3xl animate-aurora" />
                            <div className="absolute -top-20 left-0 w-[50%] h-44 rounded-full blur-2xl animate-aurora" style={{ animationDelay: '2s' }} />
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-20 overflow-hidden">
                        {stars.map(star => (
                            <div
                                key={star.id}
                                className="absolute bg-white rounded-full"
                                style={{
                                    width: star.width,
                                    height: star.height,
                                    top: star.top,
                                    left: star.left,
                                    opacity: star.opacity,
                                    animation: `icon-star-twinkle ${2 + Math.random() * 3}s infinite alternate`
                                }}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Clouds for both modes */}
            <div className={`absolute top-0 left-0 w-full h-full transition-opacity opacity-50 dark:opacity-20`}>
                <div className="absolute top-[10%] left-0 w-64 h-24 bg-white rounded-full filter blur-3xl animate-[cloud-drift-left_80s_linear_infinite]" />
                <div className="absolute top-[25%] left-0 w-80 h-32 bg-white rounded-full filter blur-3xl animate-[cloud-drift-right_120s_linear_infinite]" style={{ animationDelay: '-60s' }} />
            </div>

            {/* Snowfall for both modes */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {snowFlakes.map(flake => (
                    <div
                        key={flake.id}
                        className="absolute rounded-full bg-white/90"
                        style={{
                            left: `${flake.left}%`,
                            top: `-10%`,
                            width: `${flake.size}px`,
                            height: `${flake.size}px`,
                            opacity: 0.8 - Math.random() * 0.4,
                            animation: `winter-snow-fall ${flake.duration}s linear ${flake.delay}s infinite`,
                        }}
                    />
                ))}
            </div>

            {/* Foreground elements */}
            <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                {/* Pine Trees */}
                <div
                    className="absolute bottom-12 left-[15%] w-24 h-48 opacity-20 dark:opacity-30"
                    style={{
                        background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><polygon points="50,0 100,200 0,200" fill="${isDarkMode ? '%2306203A' : '%23B0C4DE'}" /></svg>')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                    }}
                />
                <div
                    className="absolute bottom-12 right-[10%] w-32 h-64 opacity-20 dark:opacity-30"
                    style={{
                        background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><polygon points="50,0 100,200 0,200" fill="${isDarkMode ? '%2306203A' : '%23B0C4DE'}" /></svg>')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                    }}
                />
                {/* Snow Banks */}
                <div className={`absolute left-0 right-0 bottom-0 h-32 rounded-t-[100%] ${isDarkMode ? 'bg-gradient-to-t from-[#071936] via-[#071936] to-transparent' : 'bg-white/80'}`} />
            </div>
        </div>
    );
};

const ChristmasThemeBackground: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const snowFlakes = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        size: 4 + Math.random() * 8,
        duration: 6 + Math.random() * 6,
    })), []);

    const stars = useMemo(() => Array.from({ length: 70 }).map((_, i) => ({
        id: i, width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
        opacity: 0.5 + Math.random() * 0.6,
    })), []);

    return (
        <div className={`w-full h-full overflow-hidden relative transition-colors duration-700 ${isDarkMode ? 'bg-[linear-gradient(180deg,#0a1936,#1e2d4c)]' : 'bg-[linear-gradient(180deg,#f0f9ff,#dbeafe)]'}`}>
            {/* Aurora and Stars for Dark Mode */}
            {isDarkMode && (
                <>
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 mix-blend-color-dodge opacity-60">
                            <div className="absolute -top-40 left-1/4 w-[70%] h-56 rounded-full blur-3xl animate-aurora" style={{ background: 'radial-gradient(ellipse at center, rgba(220, 38, 38, 0.1), rgba(34, 197, 94, 0.08), transparent 70%)' }} />
                            <div className="absolute -top-20 left-0 w-[50%] h-44 rounded-full blur-2xl animate-aurora" style={{ animationDelay: '2s', background: 'radial-gradient(ellipse at center, rgba(253, 186, 116, 0.1), rgba(59, 130, 246, 0.08), transparent 70%)' }} />
                        </div>
                    </div>
                    <div className="absolute inset-0 -z-20 overflow-hidden">
                        {stars.map(star => (
                            <div key={star.id} className="absolute bg-white rounded-full" style={{ ...star, animation: `icon-star-twinkle ${2 + Math.random() * 3}s infinite alternate` }} />
                        ))}
                    </div>
                </>
            )}

            {/* Snowfall for both modes */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                {snowFlakes.map(flake => (
                    <div key={flake.id} className="absolute rounded-full bg-white/90" style={{
                        left: `${flake.left}%`, top: `-10%`, width: `${flake.size}px`, height: `${flake.size}px`,
                        opacity: 0.8 - Math.random() * 0.4, animation: `christmas-snow-fall ${flake.duration}s linear ${flake.delay}s infinite`,
                    }} />
                ))}
            </div>

            {/* Foreground elements with lights */}
            <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                {/* Decorated Pine Trees */}
                {[
                    { left: '15%', w: 24, h: 48, delay: 0 },
                    { left: '70%', w: 32, h: 64, delay: 0.5 }
                ].map((tree, i) => (
                    <div key={i} className={`absolute bottom-12 w-${tree.w} h-${tree.h}`} style={{ left: tree.left }}>
                        <div className="absolute inset-0 opacity-20 dark:opacity-30" style={{
                            background: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><polygon points="50,0 100,200 0,200" fill="${isDarkMode ? '%2306203A' : '%23B0C4DE'}" /></svg>')`,
                            backgroundSize: 'contain', backgroundRepeat: 'no-repeat'
                        }} />
                        {/* Lights */}
                        {isDarkMode && Array.from({ length: 10 }).map((_, l) => (
                            <div key={l} className="absolute rounded-full" style={{
                                width: '4px', height: '4px', top: `${30 + Math.random() * 60}%`, left: `${20 + Math.random() * 60}%`,
                                background: ['#fca5a5', '#fdba74', '#86efac', '#93c5fd'][l % 4],
                                boxShadow: `0 0 5px ${['#fca5a5', '#fdba74', '#86efac', '#93c5fd'][l % 4]}`,
                                animation: `christmas-lights-twinkle 2s infinite alternate`,
                                animationDelay: `${tree.delay + l * 0.2}s`
                            }} />
                        ))}
                    </div>
                ))}
                <div className={`absolute left-0 right-0 bottom-0 h-32 rounded-t-[100%] ${isDarkMode ? 'bg-gradient-to-t from-[#0a1936] via-[#0a1936] to-transparent' : 'bg-white/80'}`} />
            </div>
        </div>
    );
};


const Autumn: React.FC = () => {
    const leaves = ['ðŸ‚', 'ðŸ'];
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFB347]/20 to-[#3B0A45]/30"></div>
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={i}
                    className="seasonal-element text-2xl"
                    style={{
                        left: `${random(0, 100)}vw`,
                        animation: `leaf-fall ${random(8, 15)}s linear infinite`,
                        animationDelay: `${random(0, 10)}s`,
                    }}
                >
                    {leaves[i % leaves.length]}
                </div>
            ))}
        </div>
    )
};

const Spring: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const petals = Array.from({ length: 25 }).map((_, i) => (
        <div
            key={i}
            className="seasonal-element text-xl"
            style={{
                left: `${random(0, 100)}vw`,
                animation: `petal-drift ${random(10, 18)}s linear infinite`,
                animationDelay: `${random(0, 10)}s`,
                color: isDarkMode ? 'rgba(255, 182, 193, 0.9)' : 'rgba(255, 182, 193, 0.8)',
                filter: isDarkMode ? 'drop-shadow(0 0 5px rgba(255, 182, 193, 0.7))' : 'none'
            }}
        >
            ðŸŒ¸
        </div>
    ));

    if (isDarkMode) {
        return (
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-800 to-purple-900/50"></div>
                {petals}
            </div>
        )
    }

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-200/20 via-pink-200/20 to-green-200/20"></div>
            {petals}
        </div>
    );
};


const Summer: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const backgroundStyle = {
        background: isDarkMode
            ? 'linear-gradient(to bottom, #0a1b2f, #1e4d71 50%, #3cb7b4 100%)' // Night beach
            : 'linear-gradient(to bottom, #aee1f9, #fddbb0, #fdf3dc)', // Day beach
    };

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-0" style={backgroundStyle}></div>

            {/* Drifting Clouds */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[10%] left-0 w-64 h-24 bg-white/30 rounded-full filter blur-2xl animate-[cloud-drift-left_80s_linear_infinite]" />
                <div className="absolute top-[25%] left-0 w-80 h-32 bg-white/20 rounded-full filter blur-3xl animate-[cloud-drift-right_120s_linear_infinite]" style={{ animationDelay: '-60s' }} />
            </div>

            {/* Floating Pollen / Dust Motes */}
            {Array.from({ length: 25 }).map((_, i) => (
                <div
                    key={`pollen-${i}`}
                    className="absolute rounded-full bottom-[-10vh]"
                    style={{
                        left: `${random(0, 100)}vw`,
                        width: `${random(1, 3)}px`,
                        height: `${random(1, 3)}px`,
                        backgroundColor: isDarkMode ? 'rgba(253, 251, 212, 0.4)' : 'rgba(255, 255, 255, 0.7)',
                        // @ts-ignore
                        '--max-opacity': random(0.3, 0.7),
                        animation: `pollen-drift ${random(15, 30)}s ease-in-out infinite`,
                        animationDelay: `${random(0, 20)}s`,
                    }}
                />
            ))}

            {/* Bokeh Sparkles */}
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={`bokeh-${i}`}
                    className="absolute rounded-full"
                    style={{
                        top: `${random(20, 80)}vh`,
                        left: `${random(0, 100)}vw`,
                        width: `${random(10, 50)}px`,
                        height: `${random(10, 50)}px`,
                        backgroundColor: isDarkMode ? 'rgba(174, 225, 249, 0.1)' : 'rgba(255, 215, 94, 0.15)',
                        animation: `bokeh-sparkle ${random(8, 15)}s ease-in-out infinite alternate`,
                        animationDelay: `${random(0, 10)}s`,
                    }}
                />
            ))}

            {/* Heat Shimmer */}
            <div className="absolute bottom-0 left-0 w-full h-1/4 bg-transparent animate-[heat-shimmer_7s_ease-in-out_infinite]" />
        </div>
    );
};

const Holi: React.FC = () => {
    const colors = ['#EF4444', '#38BDF8', '#22C55E', '#FFB400', '#a855f7'];
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={i}
                    className="seasonal-element"
                    style={{
                        left: `${random(10, 90)}vw`,
                        top: `${random(10, 90)}vh`,
                        width: `${random(50, 150)}px`,
                        height: `${random(50, 150)}px`,
                        backgroundColor: colors[i % colors.length],
                        borderRadius: '50%',
                        animation: `holi-burst 2s ease-out infinite`,
                        animationDelay: `${random(0, 2)}s`,
                        filter: 'blur(30px)',
                    }}
                />
            ))}
        </div>
    )
};

const lightningPaths = [
    "M 50 0 L 60 40 L 40 40 L 50 80 L 60 80 L 45 120 L 50 120 L 40 160",
    "M 50 0 L 40 50 L 65 50 L 55 100 L 45 100 L 60 150",
    "M 50 0 L 55 30 L 45 30 L 50 70 L 65 70 L 40 110 L 50 110 L 45 140",
];

// --- Intelligent Monsoon Theme ---

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
interface WeatherConfig {
    rain: { count: number; speed: [number, number] };
    lightning: { chance: number; minDelay: number; maxDelay: number };
    fogOpacity: number;
}

const getTimeOfDay = (): TimeOfDay => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'morning';
    if (hour >= 10 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

const weatherConfigs: Record<TimeOfDay, WeatherConfig> = {
    morning: { rain: { count: 40, speed: [2, 3] }, lightning: { chance: 0.1, minDelay: 20000, maxDelay: 30000 }, fogOpacity: 0.3 },
    afternoon: { rain: { count: 70, speed: [1.5, 2.5] }, lightning: { chance: 0.4, minDelay: 10000, maxDelay: 20000 }, fogOpacity: 0.4 },
    evening: { rain: { count: 100, speed: [1, 2] }, lightning: { chance: 0.7, minDelay: 6000, maxDelay: 15000 }, fogOpacity: 0.6 },
    night: { rain: { count: 30, speed: [2.5, 4] }, lightning: { chance: 0.2, minDelay: 15000, maxDelay: 25000 }, fogOpacity: 0.5 },
};

const Monsoon: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay);
    const [isIdle, setIsIdle] = useState(true);
    const [lightning, setLightning] = useState<{ key: number; position: string } | null>(null);

    useEffect(() => {
        const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let idleTimer: number;
        const handleActivity = () => {
            setIsIdle(false);
            clearTimeout(idleTimer);
            idleTimer = window.setTimeout(() => setIsIdle(true), 30000);
        };
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('scroll', handleActivity);
        handleActivity();
        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            clearTimeout(idleTimer);
        };
    }, []);

    useEffect(() => {
        let lightningTimer: number;
        const scheduleLightning = () => {
            const config = weatherConfigs[timeOfDay];
            const delay = random(config.lightning.minDelay, config.lightning.maxDelay);
            lightningTimer = window.setTimeout(() => {
                if (Math.random() < config.lightning.chance) {
                    const positionClass = ['left-1/4', 'left-1/2', 'left-3/4'][Math.floor(random(0, 3))];
                    setLightning({ key: Date.now(), position: positionClass });
                    setTimeout(() => setLightning(null), 1500);
                }
                scheduleLightning();
            }, delay);
        };
        scheduleLightning();
        return () => clearTimeout(lightningTimer);
    }, [timeOfDay]);

    const params = useMemo(() => {
        const config = weatherConfigs[timeOfDay];
        const activityMultiplier = isIdle ? 0.7 : 1.3;
        return {
            rainCount: Math.round(config.rain.count * activityMultiplier),
            rainSpeed: [config.rain.speed[0] / activityMultiplier, config.rain.speed[1] / activityMultiplier] as [number, number],
            fogOpacity: config.fogOpacity * (isIdle ? 1 : 1.2),
        };
    }, [timeOfDay, isIdle]);

    const getGradient = () => {
        if (isDarkMode) {
            switch (timeOfDay) {
                case 'morning': return 'linear-gradient(to bottom, #1e3a5f, #3c5a7f, #5a7b9f)';
                case 'afternoon': return 'linear-gradient(to bottom, #0a1b2f, #1e3a5f, #3c5a7f)';
                case 'evening': return 'linear-gradient(to bottom, #0a101a, #0a1b2f, #1e3a5f)';
                case 'night': return 'linear-gradient(to bottom, #05080d, #0a101a, #0a1b2f)';
            }
        }
        switch (timeOfDay) {
            case 'morning': return 'linear-gradient(to bottom, #c4d3e2, #d1d9e2, #e0e6ec)';
            case 'afternoon': return 'linear-gradient(to bottom, #a1b0c0, #b8c5d3, #d1d9e2)';
            case 'evening': return 'linear-gradient(to bottom, #8a99aa, #a1b0c0, #b8c5d3)';
            case 'night': return 'linear-gradient(to bottom, #3c5a7f, #5a7b9f, #8a99aa)';
        }
    };

    const rainDrops = useMemo(() => {
        return Array.from({ length: params.rainCount }).map((_, i) => (
            <div
                key={i}
                className="absolute"
                style={{
                    left: `${random(-10, 110)}vw`,
                    width: '2px', // Increased visibility
                    height: `${random(15, 40)}px`,
                    backgroundColor: isDarkMode ? 'rgba(173, 216, 230, 0.8)' : 'rgba(70, 130, 180, 0.6)', // Darker/More visible blue
                    animation: `rain-fall ${random(params.rainSpeed[0], params.rainSpeed[1])}s linear infinite`,
                    animationDelay: `${random(0, 2)}s`,
                }}
            />
        ));
    }, [params.rainCount, params.rainSpeed, isDarkMode]);

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-0 transition-colors duration-1000" style={{ background: getGradient() }}></div>

            <AnimatePresence>
                {lightning && (
                    <motion.div key={lightning.key} className="absolute inset-0">
                        <div className="absolute inset-0 bg-sky-200/50" style={{ animation: 'lightning-scene-flicker 1.5s ease-out' }} />
                        <div className={lightning.position}>
                            <LightningBoltIcon paths={lightningPaths} isDarkMode={isDarkMode} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {rainDrops}
        </div>
    );
};

const NewYear: React.FC = () => {
    // Generate static sparkles
    const sparkles = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        left: random(0, 100),
        top: random(0, 100),
        size: random(1, 3),
        delay: random(0, 5),
        duration: random(2, 4)
    })), []);

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#1e1b4b] to-slate-950"></div>

            {/* Distant Fireworks flashes */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={`firework-bg-${i}`}
                    className="absolute rounded-full opacity-0"
                    style={{
                        left: `${random(10, 90)}vw`,
                        top: `${random(5, 50)}vh`,
                        width: '300px',
                        height: '300px',
                        background: `radial-gradient(circle, ${['#fbbf24', '#f472b6', '#22d3ee'][i % 3]} 0%, transparent 70%)`,
                        animation: `firework-flash ${random(4, 8)}s ease-out infinite`,
                        animationDelay: `${random(0, 5)}s`,
                        filter: 'blur(40px)',
                    }}
                />
            ))}

            {/* Golden Sparkles */}
            {sparkles.map(sparkle => (
                <div
                    key={sparkle.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${sparkle.left}%`,
                        top: `${sparkle.top}%`,
                        width: `${sparkle.size}px`,
                        height: `${sparkle.size}px`,
                        backgroundColor: '#FDE047', // Yellow-300
                        boxShadow: '0 0 4px #FDE047',
                        animation: `icon-star-twinkle ${sparkle.duration}s ease-in-out infinite`,
                        animationDelay: `${sparkle.delay}s`,
                    }}
                />
            ))}

            {/* Rising Particles */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={`particle-${i}`}
                    className="absolute rounded-full bg-white/40"
                    style={{
                        left: `${random(0, 100)}vw`,
                        top: '110vh',
                        width: `${random(2, 4)}px`,
                        height: `${random(2, 4)}px`,
                        animation: `winter-snow-fall ${random(10, 20)}s linear infinite reverse`, // Reverse for rising
                        animationDelay: `${random(0, 10)}s`,
                        opacity: random(0.2, 0.5)
                    }}
                />
            ))}
        </div>
    );
};

const Eid: React.FC<ThemeProps> = ({ isDarkMode }) => {
    if (!isDarkMode) {
        // Light mode: celebratory, soft, and bright
        return (
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-100/40 to-yellow-50/40"></div>
                {/* Gold Sparkles */}
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={`sparkle-${i}`}
                        className="absolute rounded-full"
                        style={{
                            top: `${random(10, 90)}vh`,
                            left: `${random(10, 90)}vw`,
                            width: `${random(1, 3)}px`,
                            height: `${random(1, 3)}px`,
                            backgroundColor: '#FFD700', // Gold color
                            boxShadow: '0 0 8px #FFD700',
                            animation: `icon-star-twinkle ${random(3, 6)}s ease-in-out infinite`,
                            animationDelay: `${random(0, 5)}s`,
                        }}
                    />
                ))}
            </div>
        );
    }

    // Dark mode: serene, night-sky theme
    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] to-[#3B0A45]"></div>
            <div className="absolute top-[10%] right-[15%] text-6xl opacity-80" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 15px #FFD700)' }}>
                ðŸŒ™
            </div>
            {Array.from({ length: 15 }).map((_, i) => (
                <div
                    key={i}
                    className="seasonal-element text-3xl"
                    style={{
                        top: `${random(20, 70)}vh`,
                        left: `${random(5, 95)}vw`,
                        opacity: random(0.6, 1),
                        animation: `lantern-float ${random(6, 12)}s ease-in-out infinite`,
                        animationDelay: `${random(0, 6)}s`,
                        filter: `drop-shadow(0 0 10px #FFB347)`,
                    }}
                >
                    ðŸ®
                </div>
            ))}
            {/* Sparkles */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={`sparkle-${i}`}
                    className="absolute rounded-full"
                    style={{
                        top: `${random(10, 90)}vh`,
                        left: `${random(10, 90)}vw`,
                        width: `${random(1, 2)}px`,
                        height: `${random(1, 2)}px`,
                        backgroundColor: '#FFFACD',
                        boxShadow: '0 0 8px #FFFACD',
                        animation: `icon-star-twinkle ${random(2, 5)}s ease-in-out infinite`,
                        animationDelay: `${random(0, 4)}s`,
                    }}
                />
            ))}
        </div>
    );
};

const Navratri: React.FC<ThemeProps> = ({ isDarkMode }) => {
    const backgroundStyle = {
        background: `linear-gradient(135deg, ${isDarkMode ? '#A23B72' : '#FFF4E0'
            } 0%, ${isDarkMode ? '#5B2144' : '#FBE8A6'
            } 100%)`,
        opacity: isDarkMode ? 0.3 : 0.5
    };

    return (
        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute inset-0" style={backgroundStyle}></div>
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={`dust-${i}`}
                    className="absolute rounded-full"
                    style={{
                        left: `${random(0, 100)}vw`,
                        width: `${random(1, 3)}px`,
                        height: `${random(1, 3)}px`,
                        backgroundColor: 'rgba(255, 223, 160, 0.7)',
                        animation: `golden-dust-fall ${random(20, 40)}s linear infinite`,
                        animationDelay: `${random(0, 30)}s`,
                    }}
                />
            ))}
        </div>
    );
};

const Pongal: React.FC = () => (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Gentle sunrise gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-200/40 to-yellow-100/40"></div>
        {/* Sun glow */}
        <div
            className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[50vh] h-[50vh] rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.5) 0%, rgba(255, 165, 0, 0) 70%)',
                animation: 'sun-rise-glow 10s ease-in-out infinite',
            }}
        />
        {/* Sugarcane stalks (subtle visual element) */}
        {Array.from({ length: 15 }).map((_, i) => (
            <div
                key={i}
                className="absolute bottom-0"
                style={{
                    left: `${random(0, 98)}vw`,
                    width: `${random(2, 4)}px`,
                    height: `${random(10, 30)}vh`,
                    backgroundColor: '#a3be8c',
                    opacity: 0.2,
                }}
            />
        ))}
    </div>
);

const LunarNewYear: React.FC = () => (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900 via-red-800 to-yellow-900"></div>
        {Array.from({ length: 15 }).map((_, i) => (
            <div
                key={i}
                className="seasonal-element text-5xl"
                style={{
                    top: `${random(5, 60)}vh`,
                    left: `${random(5, 95)}vw`,
                    opacity: random(0.7, 1),
                    animation: `lunar-lantern-sway ${random(8, 15)}s ease-in-out infinite`,
                    animationDelay: `${random(0, 8)}s`,
                    filter: `drop-shadow(0 0 20px #FFD700)`,
                }}
            >
                ðŸ®
            </div>
        ))}
    </div>
);

const IndependenceDayIndia: React.FC = () => {
    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(to bottom, #FF9933 25%, #FFFFFF 50%, #138808 75%)',
                    opacity: 0.8
                }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <AshokaChakraIcon
                    className="w-[60vmin] h-[60vmin] text-[#000080] opacity-10"
                    style={{ animation: `ashoka-chakra-rotate 20s linear infinite` }}
                />
            </div>
        </div>
    );
};


const Diwali: React.FC = () => (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1B1F3B] to-[#3B0A45]"></div>
        {/* Floating Sparkles (Instead of Diyas) */}
        {Array.from({ length: 30 }).map((_, i) => (
            <div
                key={`sparkle-bg-${i}`}
                className="absolute text-xl"
                style={{
                    left: `${random(0, 95)}vw`,
                    top: `${random(10, 90)}vh`,
                    animation: `icon-star-twinkle ${random(2, 5)}s ease-in-out infinite`,
                    animationDelay: `${random(0, 5)}s`,
                    filter: 'drop-shadow(0 0 10px #FFD700)',
                    opacity: random(0.3, 0.8),
                    transform: `scale(${random(0.5, 1.5)})`
                }}
            >
                âœ¨
            </div>
        ))}
        {/* Additional Bokeh Sparkles */}
        {Array.from({ length: 25 }).map((_, i) => (
            <div
                key={`sparkle-bokeh-${i}`}
                className="absolute rounded-full"
                style={{
                    top: `${random(10, 90)}vh`,
                    left: `${random(10, 90)}vw`,
                    width: `${random(1, 3)}px`,
                    height: `${random(1, 3)}px`,
                    backgroundColor: '#FFD700',
                    boxShadow: '0 0 10px #FFD700',
                    animation: `sparkle-burst ${random(1, 3)}s ease-out infinite`,
                    animationDelay: `${random(0, 3)}s`,
                }}
            />
        ))}
    </div>
);

const themeMap: Record<string, React.FC<any>> = {
    winter: WinterThemeBackground,
    autumn: Autumn,
    spring: Spring,
    summer: Summer,
    monsoon: Monsoon,
    diwali: Diwali,
    holi: Holi,
    pongal: Pongal,
    navratri: Navratri,
    christmas: ChristmasThemeBackground,
    new_year: NewYear,
    eid: Eid,
    independence_day_in: IndependenceDayIndia,
};

const SeasonalAnimations: React.FC = () => {
    const { theme: seasonalTheme } = useSeason();
    const { theme } = useTheme() as any;

    const ActiveAnimation = themeMap[seasonalTheme];

    return (
        <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
            {ActiveAnimation && <ActiveAnimation isDarkMode={theme === 'dark'} />}
        </div>
    );
};

export default SeasonalAnimations;
