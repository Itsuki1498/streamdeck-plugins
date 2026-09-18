import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export default {
  input: resolve(root, "src/index.ts"),
  output: {
    file: resolve(root, "plugin/com.codex.musescore-control.sdPlugin/bin/plugin.js"),
    format: "es",
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({ tsconfig: resolve(root, "tsconfig.json") }),
  ],
};
