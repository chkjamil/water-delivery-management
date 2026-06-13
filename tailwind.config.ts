import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e8f1ff",
          100: "#d0e3ff",
          200: "#a1c7ff",
          300: "#72aaff",
          400: "#438eff",
          500: "#1471ff",
          600: "#0f4c81",  // primary
          700: "#0a3860",
          800: "#062540",
          900: "#031220",
        },
        water: {
          light: "#e0f2fe",
          DEFAULT: "#0ea5e9",
          dark: "#0369a1",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};

export default config;
