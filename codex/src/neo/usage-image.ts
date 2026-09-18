import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, inflateSync } from "node:zlib";
import type { CodexSnapshot, UsageWindow } from "../codex/types.js";

type StatusSlot = { id: number; threadKey?: string | null; status: string };

function canonicalThreadId(threadKey: string): string {
  return threadKey.replace(/^local:/, "");
}

function workingTaskCount(slots: readonly StatusSlot[]): number {
  const seenThreads = new Set<string>();
  let keyedCount = 0;
  let hasUnkeyedWorking = false;
  for (const slot of slots) {
    if (slot.status !== "working") continue;
    if (!slot.threadKey) {
      hasUnkeyedWorking = true;
      continue;
    }
    const threadId = canonicalThreadId(slot.threadKey);
    if (seenThreads.has(threadId)) continue;
    seenThreads.add(threadId);
    keyedCount++;
  }
  return Math.max(keyedCount, hasUnkeyedWorking ? 1 : 0);
}

// Use the same clean system sans-serif that Stream Deck uses for native titles.
const fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

function escapeSvgText(value: string): string {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function svgData(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function decodeRgbaPng(buffer: Buffer): { width: number; height: number; data: Buffer } {
  let offset = 8;
  let width = 0;
  let height = 0;
  let idat = Buffer.alloc(0);
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error("Quick Look returned a non-RGBA PNG");
    } else if (type === "IDAT") {
      idat = Buffer.concat([idat, data]);
    }
    offset += length + 12;
  }

  const stride = width * 4;
  const filtered = inflateSync(idat);
  const data = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number): number => {
    const estimate = a + b - c;
    const pa = Math.abs(estimate - a);
    const pb = Math.abs(estimate - b);
    const pc = Math.abs(estimate - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const source = y * (stride + 1);
    const target = y * stride;
    const filter = filtered[source];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? data[target + x - 4] : 0;
      const above = y > 0 ? data[target - stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? data[target - stride + x - 4] : 0;
      const raw = filtered[source + x + 1];
      data[target + x] = (raw + (filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, upperLeft) : 0)) & 0xff;
    }
  }
  return { width, height, data };
}

function encodeRgbaPng(size: number, data: Buffer): Buffer {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    rows[row] = 0;
    data.copy(rows, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(rows, { level: 9 })), pngChunk("IEND", Buffer.alloc(0))]);
}

function scaleRgba(sourceSize: number, source: Buffer, scale: number): { size: number; data: Buffer } {
  const size = sourceSize * scale;
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < sourceSize; y++) {
    for (let x = 0; x < sourceSize; x++) {
      const sourceOffset = (y * sourceSize + x) * 4;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          data[((y * scale + dy) * size + x * scale + dx) * 4] = source[sourceOffset];
          data[((y * scale + dy) * size + x * scale + dx) * 4 + 1] = source[sourceOffset + 1];
          data[((y * scale + dy) * size + x * scale + dx) * 4 + 2] = source[sourceOffset + 2];
          data[((y * scale + dy) * size + x * scale + dx) * 4 + 3] = source[sourceOffset + 3];
        }
      }
    }
  }
  return { size, data };
}

const rasterCache = new Map<string, string>();
let rasterSequence = 0;

function rasterize(svg: string, cacheKey: string): string {
  const cached = rasterCache.get(cacheKey);
  if (cached) return cached;

  const renderDir = mkdtempSync(join(tmpdir(), "codex-neo-render-"));
  const sourcePath = join(renderDir, `image-${rasterSequence++}.svg`);
  const outputPath = `${sourcePath}.png`;
  try {
    writeFileSync(sourcePath, svg, "utf8");
    execFileSync("/usr/bin/qlmanage", ["-t", "-s", "144", "-o", renderDir, sourcePath], { stdio: "ignore" });
    const thumbnail = decodeRgbaPng(readFileSync(outputPath));
    const cropSize = Math.min(72, thumbnail.width, thumbnail.height);
    const crop = Buffer.alloc(cropSize * cropSize * 4);
    for (let y = 0; y < cropSize; y++) thumbnail.data.copy(crop, y * cropSize * 4, y * thumbnail.width * 4, y * thumbnail.width * 4 + cropSize * 4);
    const scaled = scaleRgba(cropSize, crop, 2);
    const image = `data:image/png;base64,${encodeRgbaPng(scaled.size, scaled.data).toString("base64")}`;
    rasterCache.set(cacheKey, image);
    return image;
  } catch {
    // The Stream Deck host runs outside the test sandbox; retain a valid image
    // URL if macOS Quick Look is unavailable in another execution environment.
    return svgData(svg);
  } finally {
    rmSync(renderDir, { recursive: true, force: true });
  }
}

function plate(panel: string): string {
  void panel;
  return "";
}

function text(value: string, x: number, y: number, size: number, weight: number, fill = "#f8fafc"): string {
  const content = escapeSvgText(value);
  const shadowX = x + (size >= 30 ? 1.1 : 0.8);
  const shadowY = y + (size >= 30 ? 1.5 : 1.1);
  const common = `text-anchor="middle" font-family="${fontFamily}" font-size="${size}" font-weight="${weight}"`;
  // Stream Deck's SVG renderer does not consistently support SVG filters.
  // Render a real offset glyph underneath so the shadow is visible there too.
  return `<text x="${shadowX}" y="${shadowY}" ${common} fill="#020617" fill-opacity=".86">${content}</text><text x="${x}" y="${y}" ${common} fill="${fill}">${content}</text>`;
}

function completionFrame(): string {
  // Keep the number visible and make the completion pulse read against any
  // user-provided background: a dark keyline anchors a bright double frame.
  return `<rect x="2.5" y="2.5" width="67" height="67" rx="12" fill="none" stroke="#020617" stroke-opacity=".92" stroke-width="6" stroke-linejoin="round"/><rect x="3.5" y="3.5" width="65" height="65" rx="11" fill="none" stroke="#f8fafc" stroke-width="3.5" stroke-linejoin="round"/><rect x="6" y="6" width="60" height="60" rx="8.5" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linejoin="round"/>`;
}

function usageSvg(window: UsageWindow | undefined, kind: "five-hour" | "weekly", backgroundImage?: string): string {
  const remaining = window ? Math.min(100, Math.max(0, window.remainingPercent)) : 0;
  const color = remaining <= 20 ? "#f87171" : remaining <= 50 ? "#fbbf24" : "#34d399";
  const label = kind === "five-hour" ? "5H" : "WEEK";
  const percentage = window ? `${Math.round(remaining)}%` : "--%";
  const fillWidth = Math.round(52 * remaining / 100);
  const backdrop = backgroundImage
    ? `<image href="${backgroundImage}" x="0" y="0" width="72" height="72" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 72 72">${backdrop}${plate("#1e2942")}${text(label, 36, 19, 13, 900, "#ffffff")}<rect x="10" y="26" width="52" height="13" rx="6.5" fill="#020617" fill-opacity=".78" stroke="#f8fafc" stroke-opacity=".65" stroke-width=".8"/>${fillWidth > 0 ? `<rect x="10" y="26" width="${fillWidth}" height="13" rx="6.5" fill="${color}"/>` : ""}${text(percentage, 36, 60, 23, 900, "#ffffff")}</svg>`;
}

export function usageImageSignature(window: UsageWindow | undefined, kind: "five-hour" | "weekly", now = Date.now()): string {
  if (!window) return `${kind}:none`;
  const resetMinute = window.resetsAt ? Math.max(0, Math.round((window.resetsAt - now) / 60000)) : "none";
  return `${kind}:${Math.round(window.remainingPercent)}:${resetMinute}`;
}

export function renderUsageImage(window: UsageWindow | undefined, kind: "five-hour" | "weekly", _now = Date.now(), backgroundImage?: string): string {
  // Keep the SVG transparent. Quick Look rasterization on macOS flattens
  // transparent SVG pixels to white, which hides the user's Stream Deck
  // background when this image is sent to a key.
  return svgData(usageSvg(window, kind, backgroundImage));
}

export function renderStatusPulseImage(image: string, pulse: boolean): string {
  if (!pulse) return image;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 72 72"><image href="${image}" x="0" y="0" width="72" height="72" preserveAspectRatio="xMidYMid meet"/>${completionFrame()}</svg>`;
  return svgData(svg);
}

export function statusImageSignature(snapshot: CodexSnapshot, pulse = false): string {
  const working = workingTaskCount(snapshot.slots);
  return `${snapshot.connected}:${working}:${pulse}`;
}

export function renderStatusImage(snapshot: CodexSnapshot, pulse = false, backgroundImage?: string): string {
  const count = workingTaskCount(snapshot.slots);
  const backdrop = backgroundImage
    ? `<image href="${backgroundImage}" x="0" y="0" width="72" height="72" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const content = count > 0
    ? text(String(count), 36, 49, 38, 900, "#ffffff")
    : text("0", 36, 49, 38, 900, "#ffffff");
  const frame = pulse ? completionFrame() : "";
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 72 72">${backdrop}${frame}${content}</svg>`);
}
