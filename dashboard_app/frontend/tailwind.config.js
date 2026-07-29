/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1A73E8',
          green: '#137333',
          yellow: '#B06000',
          red: '#C5221F',
          purple: '#9334E6',
        },
        light: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          hover: '#F1F5F9',
        }
      }
    },
  },
  plugins: [],
}
