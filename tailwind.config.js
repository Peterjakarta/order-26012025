/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED', // Vivid purple
          pink: '#EC4899'    // Vibrant pink
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(236, 72, 153, 0.3)', 
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'depth': '0 4px 12px -1px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.06)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)'
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
};