/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        water: {
          50: 'rgba(var(--water-50) / <alpha-value>)',
          100: 'rgba(var(--water-100) / <alpha-value>)',
          200: 'rgba(var(--water-200) / <alpha-value>)',
          300: 'rgba(var(--water-300) / <alpha-value>)',
          400: 'rgba(var(--water-400) / <alpha-value>)',
          500: 'rgba(var(--water-500) / <alpha-value>)',
          600: 'rgba(var(--water-600) / <alpha-value>)',
          700: 'rgba(var(--water-700) / <alpha-value>)',
          800: 'rgba(var(--water-800) / <alpha-value>)',
          900: 'rgba(var(--water-900) / <alpha-value>)',
        },
        deep: {
          50: 'rgb(var(--deep-50) / <alpha-value>)',
          100: 'rgb(var(--deep-100) / <alpha-value>)',
          200: 'rgb(var(--deep-200) / <alpha-value>)',
          300: 'rgb(var(--deep-300) / <alpha-value>)',
          400: 'rgb(var(--deep-400) / <alpha-value>)',
          500: 'rgb(var(--deep-500) / <alpha-value>)',
          600: 'rgb(var(--deep-600) / <alpha-value>)',
          700: 'rgb(var(--deep-700) / <alpha-value>)',
          800: 'rgb(var(--deep-800) / <alpha-value>)',
          900: 'rgb(var(--deep-900) / <alpha-value>)',
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
