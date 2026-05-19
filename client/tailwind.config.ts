import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#07070e',
          900: '#0d0d16',
          800: '#111118',
          700: '#1a1a26',
          600: '#21212f',
          500: '#2a2a38',
          400: '#363648',
          300: '#4a4a5c',
          200: '#6b6b80',
          100: '#9a9aad',
          50: '#c8c8d8',
        },
        gold: {
          950: '#3d2a0a',
          900: '#5a3e10',
          800: '#7a5520',
          700: '#a07840',
          600: '#c9a96e',
          500: '#d4b57a',
          400: '#e0c48e',
          300: '#e8d0a8',
          200: '#f0dfc0',
          100: '#f7eed8',
          50: '#fdf7ed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c9a96e 0%, #e8c97e 50%, #c9a96e 100%)',
        'dark-gradient': 'linear-gradient(180deg, #111118 0%, #0d0d16 100%)',
        'card-gradient': 'linear-gradient(135deg, #1a1a26 0%, #21212f 100%)',
      },
      boxShadow: {
        'gold': '0 0 20px rgba(201, 169, 110, 0.15)',
        'gold-lg': '0 0 40px rgba(201, 169, 110, 0.25)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
