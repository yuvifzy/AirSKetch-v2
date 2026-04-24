/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'brutal-bg': '#f3f0e9',
        'brutal-primary': '#02acf5',
        'brutal-green': '#1fcd81',
        'brutal-red': '#ff4d4d',
        'brutal-yellow': '#ffc800'
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-md': '6px 6px 0px 0px rgba(0,0,0,1)',
        'brutal-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      fontFamily: {
        'brutal': ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
