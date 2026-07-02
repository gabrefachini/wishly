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

        // Deprecated hue aliases — keep compiling while the sweep finishes
        cream: token("page-bg"),
        porcelain: token("surface"),
        "surface-alt": token("surface-alt"),
        coral: token("primary"),
        terracotta: token("primary-strong"),
        blush: token("surface-alt"),
        lavender: token("info-soft"),
        sage: token("primary-soft"),
        skysoft: token("surface-alt"),
        warning: token("highlight"),
        "warning-soft": token("highlight-soft"),
        "danger-soft": token("danger-soft"),

        // Warm neutral scale, now complete (200/400/600/800 were missing)
        warm: {
          50: "#faf9f6",
          100: "#efece6",
          200: "#e3dfd7",
          300: "#c9c3b9",
          400: "#9b948b",
          500: "#6e6861",
          600: "#57514b",
          700: "#423d38",
          800: "#2f2b27",
          900: "#211e1b",
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
