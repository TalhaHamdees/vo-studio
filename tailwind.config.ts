import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0e17",
          panel: "#0f1523",
          elevated: "#141b2d",
          hover: "#1a2238",
        },
        border: {
          DEFAULT: "#1f2942",
          strong: "#2a3654",
        },
        accent: {
          DEFAULT: "#3b82f6",
          glow: "#60a5fa",
        },
        success: "#22c55e",
        muted: "#6b7a9f",
        text: {
          DEFAULT: "#e6edf9",
          dim: "#8b96b3",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgb(59 130 246 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
