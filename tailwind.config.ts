import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leaf: { 950: "#0B140F", 900: "#122018", 700: "#1F3D2C" },
        rind: { DEFAULT: "#2F6B3A", bright: "#3F9A4E" },
        flesh: { DEFAULT: "#F28CA0", deep: "#D45B78" },
        pith: { DEFAULT: "#F6F1E4", muted: "#B7B0A0" },
        juice: "#FFE08A",
        danger: "#E85D5D",
        ok: "#3F9A4E",
        demo: "#6B7280",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
