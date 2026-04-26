/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2F7D6B',
          light: '#4FA08C',
          dark: '#245E50',
        },
        accent: {
          DEFAULT: '#5B8DEF',
          light: '#8BB0F5',
          dark: '#3E6FD1',
        },
        success: { DEFAULT: '#22C55E' },
        warning: { DEFAULT: '#F59E0B' },
        error: { DEFAULT: '#EF4444' },
        info: { DEFAULT: '#3B82F6' },
        surface: {
          DEFAULT: '#FFFFFF',
          background: '#F5F8F6',
          soft: '#EDF4F1',
        },
        border: {
          DEFAULT: '#D9E5DF',
        },
        text: {
          primary: '#1F2937',
          secondary: '#4B5563',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        heading: ['"DM Sans"', 'sans-serif'],
        body: ['"Nunito"', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        badge: '9999px',
        button: '8px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      },
    },
  },
  plugins: [],
};