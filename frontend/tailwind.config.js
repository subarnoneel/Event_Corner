/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          '100': '#E8E5FF',
          '500': '#6C63FF',
          '600': '#5A4BFF',
        },
        'accent': {
          '400': '#4CC9F0',
          '500': '#009FFD',
        },
        'deep-indigo': '#2A2A72',
        'navy': '#0F172A',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #6C63FF via #4CC9F0 to #009FFD)',
      },
    },
  },
  plugins: [],
}