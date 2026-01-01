/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        beechwood: {
          50: '#f2e8e5',
          100: '#e6d5d0',
          200: '#ccb5a6',
          300: '#b3957c',
          400: '#a18072',
          500: '#846358',
          600: '#6b5148',
          700: '#5a443a',
          800: '#4a372f',
          900: '#3a2a24',
        },
      },
    },
  },
  plugins: [],
}

