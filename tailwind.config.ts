import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Brighter Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: "#FF8C00", // Vibrant orange
          light: "#FFA500",
          soft: "#FFECD1",   // Soft background orange
        },
        background: {
          DEFAULT: "#FFFFFF",
          cream: "#FFECD1", // Matching reference bg
        },
        text: {
          DEFAULT: "#1A1A1A", // Darker for high contrast
          light: "#757575",
        },
      },
      borderRadius: {
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
