import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts", "src/shard.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  treeshake: true,
});
