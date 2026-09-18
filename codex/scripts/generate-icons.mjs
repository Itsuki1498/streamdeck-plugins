import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";

const root = new URL("../plugin/com.itsuki.codex-neo-deck.sdPlugin/static/imgs/", import.meta.url);

const colors = {
  navy: [15, 23, 42, 255],
  edge: [2, 6, 23, 255],
  white: [248, 250, 252, 255],
  green: [52, 211, 153, 255],
  red: [248, 113, 113, 255],
  cyan: [56, 189, 248, 255],
  violet: [167, 139, 250, 255],
  amber: [251, 191, 36, 255],
};

const glyphs = {
  approve: { color: colors.green, draw: drawCheck },
  reject: { color: colors.red, draw: drawCross },
  next: { color: colors.cyan, draw: drawNext },
  refresh: { color: colors.violet, draw: drawRefresh },
  "usage-five-hour": { color: colors.amber, draw: drawGauge },
  "usage-weekly": { color: colors.cyan, draw: drawCalendar },
  status: { color: colors.green, draw: drawPulse },
  infobar: { color: colors.cyan, draw: drawInfoBar },
  "git-status": { color: colors.green, draw: drawGitStatus },
  "git-diff": { color: colors.cyan, draw: drawGitDiff },
  "git-review": { color: colors.violet, draw: drawGitReview },
  "git-test": { color: colors.green, draw: drawGitTest },
  "git-commit-prep": { color: colors.amber, draw: drawGitCommitPrep },
};

const statusStates = {
  "status-offline": colors.red,
  "status-approval": colors.amber,
  "status-input": colors.cyan,
  "status-working": colors.violet,
  "status-error": colors.red,
  "status-ready": colors.cyan,
};

function pixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.size || y >= image.size) return;
  const offset = (y * image.size + x) * 4;
  image.data.set(color, offset);
}

function fill(image, color) {
  for (let y = 0; y < image.size; y++) {
    for (let x = 0; x < image.size; x++) pixel(image, x, y, color);
  }
}

function line(image, x1, y1, x2, y2, width, color) {
  const radius = Math.max(0.5, width / 2);
  const minX = Math.floor(Math.min(x1, x2) - radius - 1);
  const maxX = Math.ceil(Math.max(x1, x2) + radius + 1);
  const minY = Math.floor(Math.min(y1, y2) - radius - 1);
  const maxY = Math.ceil(Math.max(y1, y2) + radius + 1);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      if ((x - px) ** 2 + (y - py) ** 2 <= radius ** 2) pixel(image, x, y, color);
    }
  }
}

function circle(image, cx, cy, radius, color, width = 0) {
  const outer = radius + width / 2;
  const inner = Math.max(0, radius - width / 2);
  for (let y = Math.floor(cy - outer - 1); y <= Math.ceil(cy + outer + 1); y++) {
    for (let x = Math.floor(cx - outer - 1); x <= Math.ceil(cx + outer + 1); x++) {
      const distance = Math.hypot(x - cx, y - cy);
      if (width === 0 ? distance <= radius : distance >= inner && distance <= outer) pixel(image, x, y, color);
    }
  }
}

function roundedRect(image, left, top, right, bottom, radius, color) {
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = Math.max(left + radius - x, 0, x - (right - radius));
      const dy = Math.max(top + radius - y, 0, y - (bottom - radius));
      if (dx * dx + dy * dy <= radius * radius) pixel(image, x, y, color);
    }
  }
}

function drawCheck(image, color) {
  line(image, image.size * 0.22, image.size * 0.53, image.size * 0.45, image.size * 0.75, image.size * 0.12, color);
  line(image, image.size * 0.45, image.size * 0.75, image.size * 0.8, image.size * 0.27, image.size * 0.12, color);
}

function drawCross(image, color) {
  line(image, image.size * 0.25, image.size * 0.25, image.size * 0.75, image.size * 0.75, image.size * 0.12, color);
  line(image, image.size * 0.75, image.size * 0.25, image.size * 0.25, image.size * 0.75, image.size * 0.12, color);
}

function drawNext(image, color) {
  line(image, image.size * 0.18, image.size * 0.5, image.size * 0.7, image.size * 0.5, image.size * 0.12, color);
  line(image, image.size * 0.52, image.size * 0.29, image.size * 0.78, image.size * 0.5, image.size * 0.12, color);
  line(image, image.size * 0.52, image.size * 0.71, image.size * 0.78, image.size * 0.5, image.size * 0.12, color);
}

function drawRefresh(image, color) {
  circle(image, image.size * 0.5, image.size * 0.5, image.size * 0.28, color, image.size * 0.1);
  line(image, image.size * 0.68, image.size * 0.23, image.size * 0.79, image.size * 0.25, image.size * 0.11, color);
  line(image, image.size * 0.79, image.size * 0.25, image.size * 0.77, image.size * 0.37, image.size * 0.11, color);
  line(image, image.size * 0.32, image.size * 0.77, image.size * 0.21, image.size * 0.75, image.size * 0.11, color);
  line(image, image.size * 0.21, image.size * 0.75, image.size * 0.23, image.size * 0.63, image.size * 0.11, color);
}

function drawGauge(image, color) {
  circle(image, image.size * 0.5, image.size * 0.55, image.size * 0.32, color, image.size * 0.1);
  line(image, image.size * 0.5, image.size * 0.55, image.size * 0.68, image.size * 0.37, image.size * 0.1, color);
  line(image, image.size * 0.24, image.size * 0.78, image.size * 0.76, image.size * 0.78, image.size * 0.1, color);
}

function drawCalendar(image, color) {
  roundedRect(image, image.size * 0.2, image.size * 0.23, image.size * 0.8, image.size * 0.78, image.size * 0.08, color);
  const cutout = image.state ? colors.navy : color;
  line(image, image.size * 0.2, image.size * 0.4, image.size * 0.8, image.size * 0.4, image.size * 0.08, cutout);
  line(image, image.size * 0.38, image.size * 0.49, image.size * 0.38, image.size * 0.7, image.size * 0.06, cutout);
  line(image, image.size * 0.58, image.size * 0.49, image.size * 0.58, image.size * 0.7, image.size * 0.06, cutout);
  line(image, image.size * 0.25, image.size * 0.6, image.size * 0.75, image.size * 0.6, image.size * 0.06, cutout);
}

function drawPulse(image, color) {
  line(image, image.size * 0.16, image.size * 0.56, image.size * 0.34, image.size * 0.56, image.size * 0.1, color);
  line(image, image.size * 0.34, image.size * 0.56, image.size * 0.43, image.size * 0.31, image.size * 0.1, color);
  line(image, image.size * 0.43, image.size * 0.31, image.size * 0.55, image.size * 0.72, image.size * 0.1, color);
  line(image, image.size * 0.55, image.size * 0.72, image.size * 0.66, image.size * 0.47, image.size * 0.1, color);
  line(image, image.size * 0.66, image.size * 0.47, image.size * 0.84, image.size * 0.47, image.size * 0.1, color);
}

function drawReady(image, color) {
  // READY is represented by the same zero-count glyph as the live status key.
  const left = Math.round(image.size * 0.36);
  const top = Math.round(image.size * 0.23);
  const right = Math.round(image.size * 0.64);
  const bottom = Math.round(image.size * 0.77);
  roundedRect(image, left, top, right, bottom, Math.round(image.size * 0.13), color);
  roundedRect(image, Math.round(image.size * 0.45), Math.round(image.size * 0.35), Math.round(image.size * 0.55), Math.round(image.size * 0.65), Math.round(image.size * 0.08), [0, 0, 0, 0]);
}

function drawInfoBar(image, color) {
  roundedRect(image, image.size * 0.14, image.size * 0.24, image.size * 0.86, image.size * 0.76, image.size * 0.1, color);
  const cutout = image.state ? colors.navy : color;
  line(image, image.size * 0.27, image.size * 0.43, image.size * 0.73, image.size * 0.43, image.size * 0.08, cutout);
  line(image, image.size * 0.27, image.size * 0.59, image.size * 0.6, image.size * 0.59, image.size * 0.08, cutout);
}

function drawGitStatus(image, color) {
  circle(image, image.size * 0.27, image.size * 0.28, image.size * 0.1, color);
  circle(image, image.size * 0.27, image.size * 0.72, image.size * 0.1, color);
  circle(image, image.size * 0.73, image.size * 0.5, image.size * 0.1, color);
  line(image, image.size * 0.27, image.size * 0.38, image.size * 0.27, image.size * 0.62, image.size * 0.08, color);
  line(image, image.size * 0.37, image.size * 0.28, image.size * 0.63, image.size * 0.5, image.size * 0.08, color);
  line(image, image.size * 0.37, image.size * 0.72, image.size * 0.63, image.size * 0.5, image.size * 0.08, color);
}

function drawGitDiff(image, color) {
  line(image, image.size * 0.22, image.size * 0.3, image.size * 0.78, image.size * 0.3, image.size * 0.09, color);
  line(image, image.size * 0.22, image.size * 0.7, image.size * 0.78, image.size * 0.7, image.size * 0.09, color);
  line(image, image.size * 0.32, image.size * 0.2, image.size * 0.32, image.size * 0.4, image.size * 0.08, color);
  line(image, image.size * 0.22, image.size * 0.3, image.size * 0.42, image.size * 0.3, image.size * 0.08, color);
  line(image, image.size * 0.68, image.size * 0.6, image.size * 0.68, image.size * 0.8, image.size * 0.08, color);
  line(image, image.size * 0.58, image.size * 0.7, image.size * 0.78, image.size * 0.7, image.size * 0.08, color);
}

function drawGitReview(image, color) {
  circle(image, image.size * 0.42, image.size * 0.42, image.size * 0.23, color, image.size * 0.08);
  line(image, image.size * 0.59, image.size * 0.59, image.size * 0.79, image.size * 0.79, image.size * 0.1, color);
  line(image, image.size * 0.31, image.size * 0.43, image.size * 0.4, image.size * 0.52, image.size * 0.07, color);
  line(image, image.size * 0.4, image.size * 0.52, image.size * 0.55, image.size * 0.34, image.size * 0.07, color);
}

function drawGitTest(image, color) {
  line(image, image.size * 0.36, image.size * 0.2, image.size * 0.64, image.size * 0.2, image.size * 0.08, color);
  line(image, image.size * 0.43, image.size * 0.2, image.size * 0.43, image.size * 0.42, image.size * 0.08, color);
  line(image, image.size * 0.57, image.size * 0.2, image.size * 0.57, image.size * 0.42, image.size * 0.08, color);
  roundedRect(image, image.size * 0.27, image.size * 0.4, image.size * 0.73, image.size * 0.8, image.size * 0.12, color);
  line(image, image.size * 0.38, image.size * 0.61, image.size * 0.46, image.size * 0.69, image.size * 0.07, colors.navy);
  line(image, image.size * 0.46, image.size * 0.69, image.size * 0.63, image.size * 0.51, image.size * 0.07, colors.navy);
}

function drawGitCommitPrep(image, color) {
  circle(image, image.size * 0.5, image.size * 0.5, image.size * 0.32, color, image.size * 0.08);
  line(image, image.size * 0.31, image.size * 0.51, image.size * 0.45, image.size * 0.64, image.size * 0.09, color);
  line(image, image.size * 0.45, image.size * 0.64, image.size * 0.71, image.size * 0.35, image.size * 0.09, color);
}

function drawWithShadow(image, draw, color) {
  const shadow = { size: image.size, state: image.state, data: Buffer.alloc(image.data.length) };
  draw(shadow, [0, 0, 0, 170]);
  for (let y = 0; y < image.size; y++) {
    for (let x = 0; x < image.size; x++) {
      const source = (y * image.size + x) * 4;
      const alpha = shadow.data[source + 3];
      if (!alpha) continue;
      const targetX = x + Math.max(1, Math.round(image.size * 0.025));
      const targetY = y + Math.max(1, Math.round(image.size * 0.035));
      if (targetX >= image.size || targetY >= image.size) continue;
      const target = (targetY * image.size + targetX) * 4;
      const opacity = alpha / 255;
      image.data[target] = Math.round(shadow.data[source] * opacity + image.data[target] * (1 - opacity));
      image.data[target + 1] = Math.round(shadow.data[source + 1] * opacity + image.data[target + 1] * (1 - opacity));
      image.data[target + 2] = Math.round(shadow.data[source + 2] * opacity + image.data[target + 2] * (1 - opacity));
      image.data[target + 3] = Math.max(image.data[target + 3], alpha);
    }
  }
  draw(image, color);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

function png(image) {
  const rows = Buffer.alloc(image.size * (image.size * 4 + 1));
  for (let y = 0; y < image.size; y++) {
    rows[y * (image.size * 4 + 1)] = 0;
    image.data.copy(rows, y * (image.size * 4 + 1) + 1, y * image.size * 4, (y + 1) * image.size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.size, 0);
  header.writeUInt32BE(image.size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function makeImage(size, name, { state = false, attention = false, highlight = false, busy = false } = {}) {
  const image = { size, state, data: Buffer.alloc(size * size * 4) };
  const baseName = name.replace(/-(attention|highlight|busy|v2)$/, "");
  const glyph = glyphs[baseName] ?? glyphs.status;
  const drawGlyph = (color) => ["approve", "reject", "next", "git-status", "git-diff", "git-review", "git-test", "git-commit-prep"].includes(baseName)
    ? drawWithShadow(image, glyph.draw, color)
    : glyph.draw(image, color);
  if (state) {
    fill(image, [0, 0, 0, 0]);
    const gitStatusColor = { "git-status-dirty": colors.amber, "git-status-conflict": colors.red, "git-status-norepo": colors.violet }[name];
    const color = statusStates[name] ?? gitStatusColor ?? (attention ? (baseName === "approve" ? colors.green : colors.red) : highlight ? colors.amber : busy ? colors.amber : glyph.color);
    drawGlyph(color);
  } else {
    const transparent = [0, 0, 0, 0];
    fill(image, transparent);
    drawGlyph(colors.white);
  }
  return png(image);
}

async function writePair(directory, name, options = {}) {
  await writeFile(new URL(`${directory}/${name}.png`, root), makeImage(directory === "states" ? 72 : 20, name, options));
  await writeFile(new URL(`${directory}/${name}@2x.png`, root), makeImage(directory === "states" ? 144 : 40, name, options));
}

await mkdir(new URL("actions/", root), { recursive: true });
await mkdir(new URL("states/", root), { recursive: true });
for (const name of Object.keys(glyphs)) {
  await writePair("actions", name);
  await writePair("states", name, { state: true });
}
for (const [name, color] of Object.entries(statusStates)) {
  glyphs[name] = { color, draw: name === "status-ready" ? drawReady : drawPulse };
  await writePair("states", name, { state: true });
  await writePair("states", `${name}-v2`, { state: true });
}
await writePair("states", "approve-attention", { state: true, attention: true });
await writePair("states", "reject-attention", { state: true, attention: true });
await writePair("states", "next-highlight", { state: true, highlight: true });
await writePair("states", "refresh-busy", { state: true, busy: true });
await writePair("states", "git-status-dirty", { state: true });
await writePair("states", "git-status-conflict", { state: true });
await writePair("states", "git-status-norepo", { state: true });
for (const name of ["git-diff", "git-review", "git-test", "git-commit-prep"]) await writePair("states", `${name}-busy`, { state: true, busy: true });
console.log(`✔ Generated ${Object.keys(glyphs).length} Codex icon pairs`);
