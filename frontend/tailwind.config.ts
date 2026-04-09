import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#e2e8f0",
        muted: "#f8fafc",
      },
    },
  },
  plugins: [],
};

export default config;
