import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./stores/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#070A12",
        panel: "#0B1020",
        panel2: "#101827",
        cyan: {
          glow: "#22D3EE"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(34, 211, 238, 0.18)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.35)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
