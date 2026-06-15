import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        terra: {
          ink: "#24312b",
          leaf: "#426b4f",
          moss: "#6f8a5f",
          clay: "#b66b48",
          rose: "#b14f63",
          cream: "#fffaf0",
          paper: "#f7efe1"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(36, 49, 43, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
