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
          blue: '#4285F4',
          green: '#34A853',
          yellow: '#FBBC05',
          red: '#EA4335',
          purple: '#A142F4',
        },
        dark: {
          bg: '#08080C',
          card: '#12121A',
          border: '#222232',
          hover: '#1B1B26',
        }
      }
    },
  },
  plugins: [],
}
