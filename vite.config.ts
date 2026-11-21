import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The Python this app visualizes is vendored in `sources/` and imported
// verbatim with `?raw`, so a clean checkout can build on its own.
const sourcesRoot = fileURLToPath(new URL("./sources", import.meta.url));

export default defineConfig({
  // Relative asset URLs let the build work under a GitHub Pages project path.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@sources": sourcesRoot },
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
