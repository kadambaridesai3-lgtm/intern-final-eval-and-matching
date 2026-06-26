/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tata: {
          navy: '#003366',
          blue: '#0055A4',
          light: '#E8F0FA',
          orange: '#E87722',
          gold: '#C8960C',
        },
      },
    },
  },
  plugins: [],
};
