/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'tornado': {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
                'mixer': {
                    bg: '#0b0f12',
                    panel: '#10161b',
                    'panel-2': '#0e1419',
                    card: '#0f1720',
                    muted: '#7a91a7',
                    txt: '#e7f1fb',
                    accent: '#68f6bf',
                    'accent-2': '#5ae3ff',
                    danger: '#ff6b6b',
                    warn: '#ffd166',
                    border: '#15222c',
                }
            },
            fontFamily: {
                'mono': ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
            },
            boxShadow: {
                'mixer': '0 10px 30px rgba(0, 0, 0, .45)',
                'tornado': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
            backgroundImage: {
                'gradient-mixer': 'radial-gradient(1200px 600px at 20% -10%, #10212b 0%, rgba(16, 22, 27, 0) 60%)',
                'tornado-gradient': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'tornado-spin': 'tornadoSpin 20s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0px)', opacity: '1' },
                },
                tornadoSpin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                }
            }
        },
    },
    plugins: [],
}
