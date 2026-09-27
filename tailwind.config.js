/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Monad brand palette — reuse these classes everywhere,
        // e.g. bg-monad-purple, text-monad-purple2
        monad: {
          // Official Monad brand palette (monad.xyz/brand-and-media-kit):
          // primary #6E54FF · lavender #DDD7FE · dark #0E091C ·
          // secondary pink #FF8EE4 · cyan #85E6FF · orange #FFAE45
          bg: '#07050f',
          bg2: '#150e33',
          card: '#110b22',
          card2: '#1c1438',
          line: '#2f2560',
          purple: '#6E54FF',
          purple2: '#B9ABFF', // light tint of #6E54FF for text on dark
          berry: '#FF8EE4',
          green: '#2ee67f',
          navy: '#0E091C',
          txt: '#FBFAF9',
          sub: '#a59dcc', // secondary text — light enough to read on card bg
        },
      },
      keyframes: {
        fade: {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'none' },
        },
      },
      animation: { fade: 'fade .25s ease' },
    },
  },
  plugins: [],
}
