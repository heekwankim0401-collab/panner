import { defineConfig } from "vitest/config";

// vite.config.ts는 root가 web/이라 테스트를 찾지 못하므로 따로 둔다.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
