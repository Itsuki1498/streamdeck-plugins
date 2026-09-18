import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { paletteCategories, paletteIcon } from "../plugin/com.codex.musescore-control.sdPlugin/ui/palette-shared.js";
import { musescoreGlyph } from "../plugin/com.codex.musescore-control.sdPlugin/ui/official-musescore-icons.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = resolve(projectRoot, "plugin/com.codex.musescore-control.sdPlugin");

for (const group of paletteCategories) {
  const first = group.items[0];
  const dataUri = paletteIcon(group.id, first.id);
  const svg = decodeURIComponent(dataUri.slice(dataUri.indexOf(",") + 1));
  writeFileSync(resolve(pluginRoot, `static/imgs/actions/palette-${group.id}.svg`), svg, "utf8");
}

writeFileSync(
  resolve(pluginRoot, "static/imgs/actions/command.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" style="color:#ffffff"><defs><filter id="icon-shadow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/><feOffset in="blur" dx="0" dy="3" result="offsetBlur"/><feFlood flood-color="#000000" flood-opacity="0.9" result="shadowColor"/><feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g color="#ffffff" fill="#ffffff" stroke="#ffffff" filter="url(#icon-shadow)">${musescoreGlyph("note-quarter", 72, 72, 112)}</g></svg>`,
  "utf8",
);

const staticActionIcon = (content) => `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" style="color:#ffffff"><defs><filter id="icon-shadow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/><feOffset in="blur" dx="0" dy="3" result="offsetBlur"/><feFlood flood-color="#000000" flood-opacity="0.9" result="shadowColor"/><feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g color="#ffffff" fill="#ffffff" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" filter="url(#icon-shadow)">${content}</g></svg>`;
writeFileSync(resolve(pluginRoot, "static/imgs/actions/measure.svg"), staticActionIcon(musescoreGlyph("insert-measure", 72, 72, 112)), "utf8");

console.log(`synced ${paletteCategories.length} palette icons and the default command icon from MuseScore's official glyph renderers`);
