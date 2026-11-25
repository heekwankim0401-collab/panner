import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// SPEC 2, 3장: web/이 Vite 루트, GitHub Pages 하위 경로에서 동작하도록 base는 './'.
export default defineConfig({
  root: "web",
  base: "./",
  plugins: [preact()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
