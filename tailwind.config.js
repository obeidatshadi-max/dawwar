/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:       '#0d1f1a',
          card:     '#132d21',
          border:   '#14532d',
          primary:  '#059669',
          text:     '#f0fdf4',
          muted:    '#86efac',
          success:  '#4ade80',
          warning:  '#fbbf24',
          error:    '#f87171',
          offer:    '#dc2626',
          wanted:   '#7c3aed',
          whatsapp: '#25d366',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
