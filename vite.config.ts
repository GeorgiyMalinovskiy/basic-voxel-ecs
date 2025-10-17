import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      // Allow serving files from backup but don't scan them
      allow: [".."],
    },
  },
  build: {
    // Exclude backup folder from build
    rollupOptions: {
      external: [/^.*\/backup\/.*/],
    },
  },
});
