import { build } from "esbuild";

await build({
  entryPoints: ["./server/server.ts"],
  bundle: true,
  platform: "node",
  target: ["node18.0"],
  outfile: "dist/server/server.js",
  plugins: [],
});
