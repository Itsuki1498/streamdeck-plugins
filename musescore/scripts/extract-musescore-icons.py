"""Extract the official MuseScore UI icon font as reusable SVG paths."""

from __future__ import annotations

import json
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FONT = PROJECT_ROOT / "MusescoreIcon.ttf"
OUTPUT = PROJECT_ROOT / "plugin/com.codex.musescore-control.sdPlugin/ui/official-musescore-icons.js"

# MuseScore's own iconcodes.h, limited to symbols used by this plugin.
ICON_CODES = {
    "zoom-out": 0xEF16, "zoom-in": 0xEF18, "play": 0xEF1D, "stop": 0xEF1E,
    "metronome": 0xEF20, "rewind": 0xEF26, "mixer": 0xEF27, "save": 0xEF29,
    "slur": 0xEF46, "dynamic-forte": 0xEF47, "time-signature": 0xEF64, "fermata": 0xEF69,
    "section-break": 0xEF6A, "ornament": 0xEF6F, "articulation": 0xEF70,
    "bracket": 0xEF71, "brace": 0xEF72, "bass-clef": 0xEF73,
    "fretboard": 0xEF75, "key-signature": 0xEF81, "line-dashed": 0xEF82,
    "line-dotted": 0xEF83, "line-normal": 0xEF84, "glissando": 0xEF62,
    "repeat-start": 0xEF68, "text-below-staff": 0xEF60, "text-above-staff": 0xEF61,
    "pedal-marking": 0xEF65, "marker": 0xEF66, "clef-treble": 0xF31A,
    "note-whole-double": 0xF365, "note-whole": 0xF366, "note-half": 0xF367,
    "note-quarter": 0xF368, "note-8th": 0xF369, "note-16th": 0xF36A,
    "note-32nd": 0xF36B, "note-64th": 0xF36C, "note-128th": 0xF36D,
    "note-dotted": 0xF372, "note-tie": 0xF373, "note-flip": 0xF374,
    "note-slur": 0xF375, "note-tuplet": 0xF376,
    "key-none": 0xF377, "key-sharp-1": 0xF378, "key-sharp-2": 0xF379,
    "key-sharp-3": 0xF37A, "key-sharp-4": 0xF37B, "key-sharp-5": 0xF37C,
    "key-sharp-6": 0xF37D, "key-sharp-7": 0xF37E, "key-flat-1": 0xF37F,
    "key-flat-2": 0xF380, "key-flat-3": 0xF381, "key-flat-4": 0xF382,
    "key-flat-5": 0xF383, "key-flat-6": 0xF384, "key-flat-7": 0xF385,
    "sharp": 0xF386, "natural": 0xF387, "flat": 0xF388,
    "flat-double": 0xF389, "sharp-double": 0xF38A, "marcato": 0xF38B,
    "accent": 0xF38C, "tenuto": 0xF38D, "staccato": 0xF38E,
    "voice-1": 0xF391, "voice-2": 0xF392, "voice-3": 0xF393, "voice-4": 0xF394,
    "note-dotted-2": 0xF395, "note-dotted-3": 0xF396, "note-dotted-4": 0xF397,
    "note-plus": 0xF39D, "note-to-right": 0xF39E, "rhythm-only": 0xF39F,
    "re-pitch": 0xF3A0, "down": 0xF3C1, "up": 0xF3C2, "pause": 0xF3C9,
    "mute": 0xF3D5, "ottava": 0xF40D, "palm-mute": 0xF40E,
    "let-ring": 0xF40F, "volta": 0xF410, "diminuendo": 0xF414,
    "crescendo": 0xF415, "tuplet-bracketed": 0xF422, "tuplet-number": 0xF423,
    "acciaccatura": 0xF427, "appoggiatura": 0xF428, "grace-4": 0xF429,
    "grace-16": 0xF42A, "grace-32": 0xF42B, "measure-repeat": 0xF431,
    "insert-measure": 0xF432, "line-break": 0xF483, "page-break": 0xF484,
    "section-break-2": 0xF485, "timesig-standard": 0xF488,
    "timesig-narrow": 0xF489, "timesig-sans": 0xF48A,
    "tempo-change": 0xF43F, "chord-symbol": 0xF352,
    "dynamic-center-1": 0xF451, "dynamic-center-2": 0xF452, "expression": 0xF453,
    "tremolo-two-notes": 0xF35F, "tremolo-one-note": 0xF361,
    "double-bar-line": 0xF347, "barline-winged": 0xF34C, "barline-unwinged": 0xF34D,
    "guitar-dive": 0xF4B3, "guitar-pre-dive": 0xF4B4,
    "guitar-dip-down": 0xF4B5, "guitar-dip-up": 0xF4B6, "guitar-scoop": 0xF4B7,
}


font = TTFont(FONT)
cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
glyphs = {}

for name, codepoint in ICON_CODES.items():
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
    glyphs[name] = {
        "d": path_pen.getCommands(),
        "cx": (x_min + x_max) / 2,
        "cy": (y_min + y_max) / 2,
        "w": x_max - x_min,
        "h": y_max - y_min,
    }

OUTPUT.write_text(
    "// Generated from MuseScore's official MusescoreIcon.ttf.\n"
    "// Source: https://github.com/musescore/muse_framework/blob/main/framework/ui/data/MusescoreIcon.ttf\n"
    "// Names/codes: framework/ui/view/iconcodes.h\n"
    f"const glyphs = {json.dumps(glyphs, ensure_ascii=False, separators=(',', ':'))};\n\n"
    "export function musescoreGlyph(name, x = 72, y = 72, size = 88, mirror = false) {\n"
    "  const glyph = glyphs[name];\n"
    "  if (!glyph) return '';\n"
    "  const scale = size / Math.max(glyph.w, glyph.h);\n"
    "  const yScale = mirror ? scale : -scale;\n"
    "  const transform = `translate(${x} ${y}) scale(${scale} ${yScale}) translate(${-glyph.cx} ${-glyph.cy})`;\n"
    "  return `<path d=\"${glyph.d}\" transform=\"${transform}\" fill=\"currentColor\"/>`;\n"
    "}\n",
    encoding="utf-8",
)
print(f"extracted {len(glyphs)} official UI glyphs -> {OUTPUT}")
