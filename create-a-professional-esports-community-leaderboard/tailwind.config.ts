import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050507",
        panel: "#111111",
        gold: "#ffd21f",
        purple: "#ef233c",
        violet: "#7f101c",
        bronze: "#c76624",
        silver: "#d7dde8"
      },
      boxShadow: {
        glow: "0 0 36px rgba(255, 210, 31, 0.28)",
        violet: "0 0 38px rgba(239, 35, 60, 0.24)"
      },
      backgroundImage: {
        "arena-grid": "linear-gradient(rgba(255,210,31,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(239,35,60,.09) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
