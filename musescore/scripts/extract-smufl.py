"""Extract official MuseScore/BravuraText SMuFL glyph outlines for the plugin.

The generated JavaScript is intentionally kept in the plugin because Stream
Deck does not guarantee that MuseScore's private font is installed system-wide.
The source font is shipped with the official MuseScore Studio application.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FONT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Applications/MuseScore 4.app/Contents/Resources/fonts/BravuraText.otf")
OUTPUT = Path(sys.argv[2]) if len(sys.argv) > 2 else PROJECT_ROOT / "plugin/com.codex.musescore-control.sdPlugin/ui/official-smufl.js"

CODEPOINTS = [
    0xE050, 0xE051, 0xE052, 0xE053, 0xE054, 0xE055, 0xE056, 0xE057,
    0xE05C, 0xE062,
    *range(0xE260, 0xE265),
    *range(0xE520, 0xE540),
    *range(0xE4A0, 0xE4BD),
    *range(0xE4C0, 0xE4D8),
    *range(0xE5D0, 0xE5E5),
    *range(0xEAA9, 0xEAB0),
    *range(0xE566, 0xE56E),
    *range(0xE220, 0xE230),
    0xE63B, 0xE63C, 0xE63E, 0xE63F,
    *range(0xE040, 0xE043), 0xE047, 0xE048, 0xE049,
    *range(0xE030, 0xE03A),
    *range(0xE0A4, 0xE0A8),
    *range(0xE634, 0xE636),
]

fonts = [TTFont(FONT)]
fallback = FONT.with_name("MScoreText.otf")
if fallback.exists() and fallback != FONT:
    fonts.append(TTFont(fallback))
glyphs = {}

for codepoint in dict.fromkeys(CODEPOINTS):
    for font in fonts:
        cmap = font.getBestCmap()
        glyph_set = font.getGlyphSet()
        glyph_name = cmap.get(codepoint)
        if not glyph_name:
            continue
        path_pen = SVGPathPen(glyph_set)
        bounds_pen = BoundsPen(glyph_set)
        glyph_set[glyph_name].draw(path_pen)
        glyph_set[glyph_name].draw(bounds_pen)
        if not bounds_pen.bounds or not path_pen.getCommands():
            continue
        x_min, y_min, x_max, y_max = bounds_pen.bounds
        glyphs[f"{codepoint:04x}"] = {
            "d": path_pen.getCommands(),
            "cx": (x_min + x_max) / 2,
            "cy": (y_min + y_max) / 2,
            "w": x_max - x_min,
            "h": y_max - y_min,
        }
        break

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(
    "// Generated from official MuseScore Studio fonts: BravuraText.otf and MScoreText.otf.\n"
    "// Sources: /Applications/MuseScore 4.app/Contents/Resources/fonts/\n"
    "// SMuFL: https://www.smufl.org/\n"
    f"const glyphs = {json.dumps(glyphs, ensure_ascii=False, separators=(',', ':'))};\n"
    "\n"
    "export function smuflGlyph(code, x = 72, y = 72, size = 82, mirror = false) {\n"
    "  const glyph = glyphs[String(code).replace(/^0x/, '').toLowerCase()];\n"
    "  if (!glyph) return '';\n"
    "  const scale = size / Math.max(glyph.w, glyph.h);\n"
    "  const yScale = mirror ? scale : -scale;\n"
    "  const transform = `translate(${x} ${y}) scale(${scale} ${yScale}) translate(${-glyph.cx} ${-glyph.cy})`;\n"
    "  return `<path d=\"${glyph.d}\" transform=\"${transform}\" fill=\"currentColor\"/>`;\n"
    "}\n",
    encoding="utf-8",
)
print(f"extracted {len(glyphs)} official glyphs from {FONT} -> {OUTPUT}")
