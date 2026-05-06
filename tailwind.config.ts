import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: "#0b6b3a",
          dark: "#074a28",
          rail: "#5a3a1f",
        },
        chip: {
          gold: "#d4af37",
        },
      },
      boxShadow: {
        card: "0 6px 14px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.25)",
        chip: "0 4px 10px rgba(0,0,0,0.4)",
      },
      fontFamily: {
        display: ["Georgia", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
