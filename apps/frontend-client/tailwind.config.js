/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FFFF00',
        base: '#000000',
        background: '#F5F5F5',
        border: '#E0E0E0',
        'secondary-text': '#666666',
        success: '#2ECC71',
        warning: '#F39C12',
        error: '#E74C3C',
        info: '#3498DB',
      },
    },
  },
  plugins: [],
};
