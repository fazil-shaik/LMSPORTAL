/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        udemy: {
          purple: '#a435f0',
          purpleDark: '#8710d8',
          purpleLight: '#f6ecfd',
          dark: '#2d2f31',
          grayBg: '#f7f9fa',
          border: '#d1d7dc',
          rating: '#b4690e',
          bestsellerBg: '#eceb98',
          bestsellerText: '#3d3c0a',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#a435f0',
          700: '#8710d8',
          800: '#6b21a8',
          900: '#581c87',
        },
        navy: {
          900: '#171538',
          950: '#0f172a',
        }
      },
    },
  },
  plugins: [],
}
