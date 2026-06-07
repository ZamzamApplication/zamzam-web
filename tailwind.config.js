/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        water: {
          50: 'rgba(236, 254, 255, 0.7)',
          100: 'rgba(207, 250, 254, 0.6)',
          200: 'rgba(165, 243, 252, 0.5)',
          300: 'rgba(103, 232, 249, 0.4)',
          400: 'rgba(34, 211, 238, 0.35)',
          500: 'rgba(6, 182, 212, 0.3)',
          600: 'rgba(8, 145, 178, 0.25)',
          700: 'rgba(14, 116, 144, 0.2)',
          800: 'rgba(21, 94, 117, 0.15)',
          900: 'rgba(22, 78, 99, 0.1)',
        },
        deep: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'Cairo', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        wave: {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '25%': { transform: 'translateX(-25%) translateY(2px)' },
          '50%': { transform: 'translateX(-50%) translateY(0)' },
          '75%': { transform: 'translateX(-25%) translateY(-2px)' },
          '100%': { transform: 'translateX(0) translateY(0)' },
        },
        ripple: {
          '0%': { boxShadow: '0 0 0 0 rgba(6, 182, 212, 0.4)' },
          '100%': { boxShadow: '0 0 0 15px rgba(6, 182, 212, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        droplet: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '50%': { transform: 'scale(1.15)', opacity: '0.3' },
          '100%': { transform: 'scale(1)', opacity: '0.6' },
        },
      },
      animation: {
        'wave': 'wave 8s ease-in-out infinite',
        'wave-slow': 'wave 12s ease-in-out infinite',
        'ripple': 'ripple 1.5s ease-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'droplet': 'droplet 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
