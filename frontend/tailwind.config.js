/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ipl: {
          orange: '#FF6B00',
          blue: '#002B5C',
          gold: '#F5A623',
          'orange-light': '#FFF3E8',
          'blue-light': '#E8F0F7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
