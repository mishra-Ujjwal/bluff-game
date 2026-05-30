/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#07111f",
        primary: "#2563eb",
        secondary: "#38bdf8",
        success: "#22c55e",
        danger: "#ef4444",
      },
      boxShadow: {
        glass: "0 16px 40px rgba(0, 0, 0, 0.24)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at top, rgba(56, 189, 248, 0.18), transparent 40%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "auto, 32px 32px, 32px 32px",
      },
    },
  },
  plugins: [],
};
