import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// base: "./" makes the build portable (works on GitHub Pages subpaths)
export default defineConfig({
  plugins: [react()],
  base: "./",
  worker: {
    format: "es",
  },
})
