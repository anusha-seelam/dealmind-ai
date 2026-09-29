/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde7ff',
          200: '#c2d3ff',
          300: '#9bb5ff',
          400: '#708dff',
          500: '#4f6ef7',
          600: '#3a52ec',
          700: '#2f40d8',
          800: '#2a37ae',
          900: '#293589',
        },
        surface: {
          DEFAULT: '#0f1117',
          card:    '#161b27',
          raised:  '#1c2333',
          border:  '#2a3349',
        },
        text: {
          primary:   '#e8eaf6',
          secondary: '#9aa0b8',
          muted:     '#555e7a',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
        memory:  '#a855f7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
