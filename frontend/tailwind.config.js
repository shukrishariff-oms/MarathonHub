/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#FBBF24', // Ohmai Yellow
                    light: '#FDE68A',
                    dark: '#D97706',
                },
                accent: {
                    DEFAULT: '#F472B6', // Ohmai Pink
                    light: '#FBCFE8',
                    dark: '#DB2777',
                },
                'ohmai-yellow': '#FBBF24',
                'ohmai-orange': '#FB923C',
                'ohmai-pink': '#F472B6',
                'ohmai-charcoal': '#0B0F1A',
                'ohmai-charcoal-light': '#161B29',
                slate: {
                    950: '#0B0F1A',
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
                display: ['Outfit', 'sans-serif'],
            },
            backdropBlur: {
                xs: '2px',
            },
            keyframes: {
                shimmer: {
                    '100%': { transform: 'translateX(100%)' },
                }
            },
            animation: {
                shimmer: 'shimmer 1.5s infinite',
            }
        },
    },
    plugins: [],
}
