import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables (see globals.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // Brand palette derived from logo's signature emerald/teal green (#0B7261)
        brand: {
          50: "#f0fdf9",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0b7261", // Primary Logo Green
          700: "#095c4e",
          800: "#08483e",
          900: "#083730", // Deep logo dark outline
          950: "#04201c",
        },
        // Soft, eye-friendly warm apricot/coral orange palette
        coral: {
          50: "#fff9f5",
          100: "#ffede0",
          200: "#fed8c1",
          300: "#fcbea0",
          400: "#f79b72",
          500: "#e97d4d",
          600: "#d26635",
          700: "#b04e22",
          800: "#8f3d18",
          900: "#743215",
        },
        sidebar: {
          DEFAULT: "#0b1f1c", // Deep dark pine tone
          hover: "#122e2a",
          active: "#0b7261", // Active menu item matching logo green
          muted: "#8fa8a4",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11,114,97,0.04), 0 1px 3px 0 rgba(11,114,97,0.06)",
        elevated:
          "0 10px 30px -12px rgba(11,114,97,0.18), 0 4px 8px -4px rgba(11,114,97,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-sans)", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
