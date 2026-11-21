import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The Python sources this app visualizes live one level up, in the repo
// itself. They are imported verbatim with `?raw`, so the dev server must be
// allowed to read them.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@repo": repoRoot },
  },
  server: {
    fs: { allow: [repoRoot] },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries change far less often than the app, so they get their own
        // long-cached chunk; it also keeps each chunk under the size warning.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "vendor", test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
