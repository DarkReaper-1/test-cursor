import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#100e0c",
        steel: {
          DEFAULT: "#8a8478",
          dim: "#5c574f",
          line: "#2c2824",
          raised: "#1c1916",
        },
        amber: {
          DEFAULT: "#d4a574",
          dim: "#a67c52",
        },
        paper: "#f2ece4",
        danger: "#c45c4a",
        success: "#7d9b7a",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
