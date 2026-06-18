/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0F3D2E',
          800: '#1A4F3C',
          700: '#25604A',
          600: '#317158',
          500: '#4A7C59',
          400: '#6D9978',
        },
        gold: {
          500: '#C8A96B',
          400: '#D4BB85',
          300: '#DFCD9F',
          200: '#EBDFB9',
          100: '#F5F1E8',
        },
        cream: {
          900: '#F5F1E8',
          800: '#EFEADB',
          700: '#E8E0CD',
        },
        coral: {
          500: '#E07A5F',
          400: '#E8957F',
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif CN"', '"Noto Serif SC"', 'SimSun', 'serif'],
        sans: ['Inter', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(15, 61, 46, 0.08)',
        'card-hover': '0 8px 24px rgba(15, 61, 46, 0.14)',
        'elevated': '0 4px 20px rgba(15, 61, 46, 0.12)',
      },
    },
  },
  plugins: [],
}
