/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#05070f',
        surface: '#0c0f1e',
        surface2: '#111827',
        border: '#1e2640',
        'border-light': '#2a3555',
        cyan: '#00e5c8',
        blue: '#3d7eff',
        'blue-dim': '#1e4db7',
        green: '#39d98a',
        orange: '#ff8c42',
        red: '#ff4d6a',
        'text-primary': '#e2e8f0',
        'text-secondary': '#8892a4',
        'text-dim': '#4a5568',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
