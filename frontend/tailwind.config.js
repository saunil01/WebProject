/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Healthcare primary: calming teal
        primary: {
          50:  "#effcf9",
          100: "#cff7ec",
          200: "#a1edd9",
          300: "#6bdec2",
          400: "#37c6a6",
          500: "#1aa88c",
          600: "#118772",
          700: "#0f6b5c",
          800: "#10554b",
          900: "#0d463f",
        },
        // Soft secondary: trustworthy blue
        accent: {
          50:  "#f0f7ff",
          100: "#dbedff",
          200: "#b7daff",
          300: "#85bcff",
          400: "#5095fb",
          500: "#2c73ef",
          600: "#1d58d0",
          700: "#1a47a6",
          800: "#1a3d85",
          900: "#1a356c",
        },
        // Surface neutrals
        surface: {
          0:   "#ffffff",
          50:  "#f8fafb",
          100: "#f1f5f7",
          200: "#e3ebee",
          300: "#cfd9de",
          400: "#a4b3ba",
          500: "#7a8b93",
          600: "#5a6b74",
          700: "#425159",
          800: "#2c3940",
          900: "#1a2428",
          950: "#0f1618",
        },
        // Semantic
        success: "#10b981",
        warning: "#f59e0b",
        danger:  "#e11d48",
        info:    "#0ea5e9",

        // Mood palette (consistent across pages)
        mood: {
          happy:    "#10b981",
          neutral:  "#94a3b8",
          sad:      "#6366f1",
          anxious:  "#f59e0b",
          stressed: "#e11d48",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"ui-sans-serif"', '"system-ui"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card:   "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)",
        lifted: "0 4px 6px rgba(15,23,42,0.06), 0 12px 24px rgba(15,23,42,0.08)",
        focus:  "0 0 0 3px rgba(26,168,140,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-in":    { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "soft-pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
      },
      animation: {
        "fade-in":    "fade-in 240ms ease-out both",
        "soft-pulse": "soft-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
