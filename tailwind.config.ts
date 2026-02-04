import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        button: {
          gold: "#DDB96B",
        },
      },
    },
  },
  plugins: [],
};

export default config;
