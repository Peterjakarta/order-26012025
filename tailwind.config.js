/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED', // Vivid purple
          pink: '#EC4899'    // Vibrant pink
        },
        dev: {
          DEFAULT: '#2dd4cf',
          50: '#f0fdfc',
          100: '#ccfaf7',
          200: '#99f6f1',
          300: '#5eeae3',
          400: '#2dd4cf',
          500: '#14b8b8',
          600: '#0e8f94',
          700: '#0f7178',
          800: '#115c63',
          900: '#134d53',
          950: '#07333a',
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
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        },
        bounce: {
          '0%, 100%': { 
            transform: 'translateY(-5%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        }
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideIn: 'slideIn 0.3s ease-in-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite'
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem'
      }
    },
  },
  plugins: [],
};