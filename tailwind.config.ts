import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0fa',
          100: '#b3d1f0',
          200: '#80b3e6',
          300: '#4d94db',
          400: '#267dd4',
          500: '#0066B3',
          600: '#005a9e',
          700: '#004d89',
          800: '#004075',
          900: '#002d54',
        },
        vnpt: {
          blue: '#0066B3',
          lightblue: '#E8F4FD',
          darkblue: '#003B6F',
          accent: '#00A3E0',
          green: '#00A651',
          orange: '#F7941D',
          red: '#E31E24',
          gray: '#F5F7FA',
        },
        success: { 50: '#e6f9ef', 500: '#00A651', 600: '#008A44' },
        warning: { 50: '#fff7e6', 500: '#F7941D', 600: '#E07F10' },
        danger: { 50: '#fde8e8', 500: '#E31E24', 600: '#C7191E' },
      },
    },
  },
  plugins: [],
};

export default config;
