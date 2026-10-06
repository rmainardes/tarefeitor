import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          strong: "hsl(var(--accent-strong))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        state: {
          done: "hsl(var(--state-done))",
          missed: "hsl(var(--state-missed))",
          covered: "hsl(var(--state-covered))",
          excused: "hsl(var(--state-excused))",
          foreground: "hsl(var(--state-foreground))",
        },
        person: {
          pedro: "hsl(var(--person-pedro))",
          vania: "hsl(var(--person-vania))",
          rodrigo: "hsl(var(--person-rodrigo))",
          "pedro-text": "hsl(var(--person-pedro-text))",
          "vania-text": "hsl(var(--person-vania-text))",
          "rodrigo-text": "hsl(var(--person-rodrigo-text))",
          active: "hsl(var(--person-active))",
          "active-text": "hsl(var(--person-active-text))",
          foreground: "hsl(var(--person-foreground))",
        },
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        numeric: "var(--font-numeric)",
      },
      borderRadius: {
        sm: "12px",
        md: "20px",
        lg: "var(--radius)",
        xl: "36px",
        "2xl": "44px",
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        card: "var(--shadow-md)",
        float: "var(--shadow-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-in": {
          from: { opacity: "0", transform: "rotate(-2deg) scale(1.25)" },
          to: { opacity: "1", transform: "rotate(-4deg) scale(1)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" },
        },
        sheen: {
          "0%": { backgroundPosition: "-140% 0" },
          "100%": { backgroundPosition: "240% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pop-in": "pop-in 220ms cubic-bezier(0.2, 0, 0, 1.18)",
        "rise-in": "rise-in 260ms cubic-bezier(0.2, 0, 0, 1)",
        "stamp-in": "stamp-in 240ms cubic-bezier(0.2, 0, 0, 1.18)",
        breathe: "breathe 2.6s ease-in-out infinite",
        sheen: "sheen 3.2s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
