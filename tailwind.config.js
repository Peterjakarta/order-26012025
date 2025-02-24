/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED', // Vivid purple
          pink: '#EC4899',   // Vibrant pink
        }
      },
      boxShadow: {
        'glow': '0 0 15px rgba(236, 72, 153, 0.3)',
      }
    },
  },
  plugins: [],
};