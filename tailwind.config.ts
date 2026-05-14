import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    "#1B2B5E",   // sidebar background
          blue:    "#2563EB",   // primary action
          sky:     "#3B82F6",   // hover/accent
          red:     "#EF4444",   // SOS / danger
          green:   "#22C55E",   // available / success
          amber:   "#F59E0B",   // warning
          gray:    "#F1F5F9",   // page background
          border:  "#E2E8F0",   // card borders
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;