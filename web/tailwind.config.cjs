module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#f5f8ff',
          100: '#e6f0ff',
          500: '#6366f1'
        }
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blobRotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulseScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        fadeInUp: 'fadeInUp 360ms cubic-bezier(.2,.9,.2,1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        blobRotate: 'blobRotate 60s linear infinite',
        pulseScale: 'pulseScale 4s ease-in-out infinite'
      },
      transitionProperty: {
        'width-height': 'width, height'
      },
    },
  },
  plugins: [],
}
