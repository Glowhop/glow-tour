import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vue()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        react: resolve(__dirname, "react/index.html"),
        vue: resolve(__dirname, "vue/index.html"),
        angular: resolve(__dirname, "angular/index.html"),
        vanilla: resolve(__dirname, "vanilla/index.html"),
      },
    },
  },
});
