/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        base: {
          950: "#080A10",
          900: "#0B0E14",
          800: "#12161F",
          700: "#181D29",
          600: "#232838",
          500: "#2E3446",
        },
        ink: {
          100: "#E8EAF0",
          300: "#B4B9C9",
          500: "#8B92A8",
          700: "#5C6377",
        },
        signal: {
          indigo: "#5B7FFF",
          indigoSoft: "#5B7FFF22",
          amber: "#FFB020",
          amberSoft: "#FFB02022",
          red: "#FF5D5D",
          redSoft: "#FF5D5D22",
          emerald: "#34D399",
          emeraldSoft: "#34D39922",
        },
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(91,127,255,0.35), 0 0 24px -4px rgba(91,127,255,0.35)",
      },
      backgroundImage: {
        ribbon: "linear-gradient(90deg, transparent, rgba(91,127,255,0.9), transparent)",
      },
    },
  },
  plugins: [],
}
