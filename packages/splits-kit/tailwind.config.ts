// eslint-disable-next-line
const colors = require('tailwindcss/colors')

// eslint-disable-next-line no-undef
module.exports = {
  darkMode: 'class',
  content: ['./public/**/*.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: 'rgba(32, 32, 32)',
      white: colors.white,
      gray: colors.gray,
      red: colors.rose,
      yellow: colors.yellow,
      green: colors.emerald,
      blue: colors.blue,
      indigo: colors.indigo,
      purple: colors.violet,
      pink: colors.pink,
      sky: colors.sky,
    },
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
