import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#00B2C2",
              100: "#C9FBEF",
              200: "#95F8E8",
              300: "#5EECE1",
              400: "#36DADA",
              500: "#00B2C2",
              600: "#008BA6",
              700: "#00698B",
              800: "#004B70",
              900: "#00365D",
            },
            success: {
              DEFAULT: "#3C962E",
              100: "#E6F9D7",
              200: "#C9F4B0",
              300: "#9DDF82",
              400: "#71C05C",
              500: "#3C962E",
              600: "#268121",
              700: "#176C19",
              800: "#0E5716",
              900: "#084814",
            },
            warning: {
              DEFAULT: "#FFCC00",
              100: "#FFF9CC",
              200: "#FFF099",
              300: "#FFE666",
              400: "#FFDC3F",
              500: "#FFCC00",
              600: "#DBAA00",
              700: "#B78B00",
              800: "#936D00",
              900: "#7A5700",
            },
            danger: {
              DEFAULT: "#FF4B3A",
              100: "#FFE7D7",
              200: "#FFCAB0",
              300: "#FFA688",
              400: "#FF846B",
              500: "#FF4B3A",
              600: "#DB2B2A",
              700: "#B71D29",
              800: "#931227",
              900: "#7A0B25",
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#006C76",
              100: "#002138", // anciennement 900
              200: "#002D44", // anciennement 800
              300: "#003F54", // anciennement 700
              400: "#005465", // anciennement 600
              500: "#006C76",
              600: "#2BACAC", // anciennement 400
              700: "#55D5CB", // anciennement 300
              800: "#90F1E1", // anciennement 200
              900: "#C6F8EC", // anciennement 100
            },
            success: {
              DEFAULT: "#2F9613",
              100: "#034809", // anciennement 900
              200: "#065706", // anciennement 800
              300: "#106C09", // anciennement 700
              400: "#1E810D", // anciennement 600
              500: "#2F9613",
              600: "#66C042", // anciennement 400
              700: "#94DF6A", // anciennement 300
              800: "#C4F49F", // anciennement 200
              900: "#E4F9CE", // anciennement 100
            },
            warning: {
              DEFAULT: "#BF8F00",
              100: "#5B3B00", // anciennement 900
              200: "#6E4A00", // anciennement 800
              300: "#895F00", // anciennement 700
              400: "#A47600", // anciennement 600
              500: "#BF8F00",
              600: "#D8B436", // anciennement 400
              700: "#EBCF5E", // anciennement 300
              800: "#F8E795", // anciennement 200
              900: "#FBF4C9", // anciennement 100
            },
            danger: {
              DEFAULT: "#CC435C",
              100: "#510338", // anciennement 900
              200: "#62053B", // anciennement 800
              300: "#7A093F", // anciennement 700
              400: "#920D3F", // anciennement 600
              500: "#AA123D",
              600: "#CC435C", // anciennement 400
              700: "#E56A75", // anciennement 300
              800: "#F69F9E", // anciennement 200
              900: "#FAD2CD", // anciennement 100
            },
          },
        },
      },
    }),
  ],
} satisfies Config;
