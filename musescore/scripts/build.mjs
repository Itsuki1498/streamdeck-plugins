import { rollup } from "rollup";
import config from "../config/rollup.config.mjs";

const bundle = await rollup(config);
try {
  await bundle.write(config.output);
  console.log("✔ Built the MuseScore bundle");
} finally {
  await bundle.close();
}

process.exit(0);
