import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: { global: "window" },
  optimizeDeps: { include: ["isoxml", "jszip"] },
  server: { port: 5173, host: true },
});
