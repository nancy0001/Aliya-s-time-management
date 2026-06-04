import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5174,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:4000"
    }
  },
  preview: {
    host: "localhost",
    port: 4174,
    strictPort: false
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
