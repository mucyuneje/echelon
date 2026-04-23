import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", 'sans-serif'],
        mono: ["'DM Mono'", 'monospace'],
        display: ["'Inter'", 'sans-serif'],
      },
      colors: {
        // Umurava blue palette
        umu: {
          blue:    '#2563EB',
          'blue-d':'#1D4ED8',
          'blue-l':'#3B82F6',
          'blue-bg':'#EFF6FF',
          sidebar: '#2563EB',
        },
        // accent kept for AI features
        green:  { DEFAULT: '#00C896', d: '#009E78' },
        amber:  { DEFAULT: '#F59E0B' },
        red:    { DEFAULT: '#EF4444' },
        ink:    { DEFAULT: '#060A10' },
        jade:   { DEFAULT: '#00C896', dark: '#009E78' },
        crimson:{ DEFAULT: '#EF4444' },
      },
    },
  },
  plugins: [],
}
export default config
