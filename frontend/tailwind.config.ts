import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182238",
        muted: "#68758b",
        canvas: "#f3f1fa",
        panel: "#ffffff",
        line: "#dfe4ee",
        brand: "#2563eb",
        sky: "#3b9ee8",
        lilac: "#7657d8",
        rose: "#d95f8d",
        mint: "#2d9d78",
        cyan: "#0891b2",
        emerald: "#059669",
        amber: "#d97706",
      },
      boxShadow: {
        panel: "0 12px 32px rgba(38, 45, 72, 0.07)",
        menu: "0 24px 70px rgba(38, 45, 72, 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
