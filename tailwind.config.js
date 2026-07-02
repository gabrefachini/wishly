/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fbf7f1",
        porcelain: "#fffdf9",
        surface: "#fffdf9",
        "surface-alt": "#f5efe7",
        border: "#e5ddd2",
        coral: "#d97863",
        terracotta: "#b95745",
        blush: "#f6ded7",
        lavender: "#ddd8fb",
        sage: "#dfe8dc",
        skysoft: "#efe6dc",
        warning: "#d7b77a",
        "warning-soft": "#f3e8d0",
        danger: "#b85e53",
        "danger-soft": "#f3dfdc",
        warm: {
          50: "#faf8f4",
          100: "#f2ece4",
          300: "#c9bdb1",
          500: "#7f746c",
          700: "#4f4741",
          900: "#29231f"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(73, 56, 45, 0.10)",
        card: "0 10px 28px rgba(87, 69, 58, 0.08)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "\"Helvetica Neue\"",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: [],
};
