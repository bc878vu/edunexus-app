/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",     // 👈 ye line bhi add kar do
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
