import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        'brand-teal': '#0e4d5f',
        'brand-orange': '#f97316',
        'brand-yellow': '#fbbf24',
        'brand-coral': '#fb7185',
        brand: {
          50: '#f0f9fa',
          100: '#d9f0f4',
          200: '#b3e1e9',
          500: '#0e4d5f',
          600: '#0a3d4c',
          700: '#082f3a',
          900: '#051f28',
        },
      },
      letterSpacing: {
        widest: '0.2em',
        ultra: '0.35em',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [forms],
}
