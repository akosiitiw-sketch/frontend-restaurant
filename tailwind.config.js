/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: {
      ink: '#172B4D', muted: '#667085', cream: '#F7F8FA', line: '#EAECF0',
      brand: { 50: '#FFF4ED', 100: '#FFE4D5', 200: '#FFCAAA', 300: '#FFAA7A', 400: '#F98F5B', 500: '#F27642', 600: '#DF6331', 700: '#B84D23' },
      mint: { 50: '#E9F8F1', 500: '#19976A' }
    },
    boxShadow: { soft: '0 4px 20px rgba(23,43,77,.06)' },
    fontFamily: {
      sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      display: ['Manrope', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']
    }
  } },
  plugins: []
}
