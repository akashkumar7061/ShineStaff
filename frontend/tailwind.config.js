/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F172A",
          light: "#1E293B",
          dark: "#020617"
        },
        secondary: {
          DEFAULT: "#2563EB",
          light: "#60A5FA",
          dark: "#1D4ED8"
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        background: {
          light: "#F8FAFC",
          dark: "#0F172A"
        },
        card: {
          light: "#FFFFFF",
          dark: "#1E293B"
        }
      },
      borderRadius: {
        'custom': '16px',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
