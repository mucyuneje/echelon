import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", 'var(--font-display)', "sans-serif"],
        body: ["'DM Sans'", 'var(--font-body)', "sans-serif"],
        mono: ["'JetBrains Mono'", 'var(--font-mono)', "monospace"],
      },
      colors: {
        // Combined colors from both files
        ink: { 
          DEFAULT: "#0A0A0F", 
          50: '#F5F5F3',
          soft: "#13131A", 
          muted: "#1E1E2A" 
        },
        jade: { 
          DEFAULT: '#00C896', 
          dark: '#00A077', 
          light: '#E0FBF4' 
        },
        acid: {
          DEFAULT: "#C8FF00",
          dim: "#A8D800",
          glow: "rgba(200,255,0,0.15)",
        },
        signal: {
          blue: "#4D9FFF",
          purple: "#9B7FFF",
          coral: "#FF6B6B",
          amber: "#FFB347",
          teal: "#4DFFD2",
        },
        amber: { DEFAULT: '#F5A623', light: '#FFF8ED' },
        crimson: { DEFAULT: '#E53E3E', light: '#FFF5F5' },
        slate: {
          dim: "#2A2A3A",
          line: "#363650",
          text: "#8888A8",
          light: "#B8B8D0",
          850: '#1A1F2E',
          900: '#111827',
          950: '#080C14',
        },
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(rgba(200,255,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,255,0,0.03) 1px, transparent 1px)",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        "grid": "32px 32px",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in': 'slideIn 0.4s ease forwards',
        'pulse-acid': 'pulseAcid 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.5s ease infinite',
        'scan': 'scan 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'score-fill': 'scoreFill 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideIn: { "0%": { opacity: "0", transform: "translateX(-16px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        pulseAcid: { "0%, 100%": { boxShadow: "0 0 0 0 rgba(200,255,0,0.2)" }, "50%": { boxShadow: "0 0 0 8px rgba(200,255,0,0)" } },
        pulseRing: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.4', transform: 'scale(1.08)' } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(400%)" } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        scoreFill: { "0%": { strokeDashoffset: "283" }, "100%": { strokeDashoffset: "var(--target-offset)" } },
      },
      boxShadow: {
        "acid": "0 0 24px rgba(200,255,0,0.2), 0 0 4px rgba(200,255,0,0.4)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,255,0,0.1)",
      },
    },
  },
  plugins: [],
}
export default config