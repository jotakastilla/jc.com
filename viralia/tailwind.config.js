/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        night: "#0c1628",
        cyan: "#61f4de",
        azure: "#55a8ff",
        coral: "#ff8a5b",
        mist: "#dce9ff",
      },
    },
  },
  plugins: [],
};
