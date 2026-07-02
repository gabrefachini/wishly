/** @type {import('tailwindcss').Config} */

// Semantic colors resolve to the CSS variables in src/styles.css — re-skin there.
// The rgb(var(--x-rgb) / <alpha-value>) form keeps opacity modifiers working.
const token = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic names — use these going forward
        page: token("page-bg"),
        surface: token("surface"),
        sunken: token("surface-alt"),
        border: token("border"),
        "border-strong": token("border-strong"),
        ink: token("text-primary"),
        "ink-muted": token("text-secondary"),
        primary: {
          DEFAULT: token("primary"),
          strong: token("primary-strong"),
          soft: token("primary-soft"),
        },
        highlight: {
          DEFAULT: token("highlight"),
          soft: token("highlight-soft"),
        },
        danger: {
          DEFAULT: token("danger"),
          soft: token("danger-soft"),
        },
        info: {
          DEFAULT: token("info"),
          soft: token("info-soft"),
        },

        "danger-soft": token("danger-soft"),

        // Ink blocks that must stay dark in BOTH color schemes (dark heroes,
        // active tabs with white text). Never use warm-900 for backgrounds.
        espresso: {
          DEFAULT: "#211e1b",
          light: "#423d38",
        },

        // Warm neutral scale, var-based so it inverts in dark mode.
        // 50 = subtlest background, 900 = strongest text — in both schemes.
        warm: {
          50: token("warm-50"),
          100: token("warm-100"),
          200: token("warm-200"),
          300: token("warm-300"),
          400: token("warm-400"),
          500: token("warm-500"),
          600: token("warm-600"),
          700: token("warm-700"),
          800: token("warm-800"),
          900: token("warm-900"),
        },
      },
      borderRadius: {
        ctrl: "10px",
        card: "14px",
        modal: "20px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(33, 30, 27, 0.05), 0 16px 40px -20px rgba(33, 30, 27, 0.14)",
        card: "0 1px 2px rgba(33, 30, 27, 0.04), 0 12px 32px -16px rgba(33, 30, 27, 0.10)",
      },
      ringColor: {
        DEFAULT: "var(--ring)",
      },
      fontFamily: {
        sans: [
          "Inter Variable",
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
