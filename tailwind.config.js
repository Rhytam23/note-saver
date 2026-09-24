export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'primary-bg': '#1B1B1F',
                'secondary-bg': '#242529',
                'surface': '#2C2D31',
                'primary-text': '#F5F6FA',
                'secondary-text': '#A1A1AA',
                'accent': '#FFB400',
                'accent-hover': '#FFD369',
                'accent-dark': '#FF6B00',
                'link': '#38BDF8',
                'error': '#EF4444',
                'success': '#22C55E',
                'divider': '#2E2E33',
                'primary-bg-light': '#F5F6FA',
                'secondary-bg-light': '#FFFFFF',
                'surface-light': '#E4E6EB',
                'primary-text-light': '#1B1B1F',
                'secondary-text-light': '#65676B',
                'divider-light': '#CED0D4',
            },
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
                serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            boxShadow: {
                'neumorphic': '5px 5px 10px #151518, -5px -5px 10px #212126',
                'neumorphic-inset': 'inset 5px 5px 10px #151518, inset -5px -5px 10px #212126',
                'glow-accent': '0 0 20px 5px rgba(255, 180, 0, 0.4)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [],
}

