const COLORS = {
  note: "#38bdf8",
  notation: "#c084fc",
  articulation: "#fb7185",
  utility: "#34d399",
  text: "#fbbf24",
};

const FONT = "Arial, Helvetica, sans-serif";

// @ts-expect-error The official font extraction is a plain JS asset shared with the property inspector.
import { musescoreGlyph } from "../plugin/com.codex.musescore-control.sdPlugin/ui/official-musescore-icons.js";
// @ts-expect-error The official SMuFL extraction is a plain JS asset shared with the property inspector.
import { smuflGlyph } from "../plugin/com.codex.musescore-control.sdPlugin/ui/official-smufl.js";

function iconSvg(content: string, background: string, accent = "#f8fafc"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <defs><filter id="icon-shadow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/><feOffset in="blur" dx="0" dy="3" result="offsetBlur"/><feFlood flood-color="#000000" flood-opacity="0.9" result="shadowColor"/><feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <g color="#ffffff" fill="#ffffff" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" filter="url(#icon-shadow)">${content}</g>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function categoryIcon(content: string, background: string): string {
  return iconSvg(
    `<rect x="18" y="19" width="108" height="106" rx="18" fill="none" stroke="currentColor" stroke-width="3"/>${content}`,
    background,
  );
}

function text(label: string, size = 56, y = 92, _fill = "#f8fafc"): string {
  return `<text x="72" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="700" fill="currentColor" stroke="none">${label}</text>`;
}

function note(flags: number, whole = false, _accent = COLORS.note): string {
  if (whole) {
    return `<ellipse cx="57" cy="91" rx="25" ry="15" fill="none" stroke="currentColor" stroke-width="9" transform="rotate(-18 57 91)"/>`;
  }

  const flagPaths = Array.from({ length: flags }, (_, index) => {
    const y = 37 + index * 17;
    return `<path d="M78 ${y} C111 ${y + 3}, 111 ${y + 21}, 84 ${y + 27}" fill="none" stroke="currentColor" stroke-width="8"/>`;
  }).join("");

  return `<ellipse cx="57" cy="94" rx="24" ry="15" transform="rotate(-18 57 94)"/>
    <path d="M76 92 V24" fill="none" stroke="currentColor" stroke-width="8"/>
    ${flagPaths}`;
}

function articulationGlyph(kind: "staccato" | "accent" | "marcato" | "tenuto" | "staccatissimo" | "portato"): string {
  if (kind === "staccato") {
    return musescoreGlyph(kind, 72, 72, 56);
  }
  if (kind === "accent" || kind === "marcato" || kind === "tenuto") {
    return musescoreGlyph(kind, 72, 72, 80);
  }
  const code = kind === "staccatissimo" ? "e4a6" : "e4a8";
  return smuflGlyph(code, 72, 72, 80);
}

function accidental(symbol: string): string {
  return text(symbol, symbol === "𝄪" || symbol === "𝄫" ? 48 : 68, 99, COLORS.notation);
}

function voiceGlyph(voice: number): string {
  const positions = [44, 66, 88, 110].slice(0, voice);
  return `${positions.map((cx) => `<circle cx="${cx}" cy="88" r="9" stroke="none"/>`).join("")}<path d="M${positions[0]} 88V38" fill="none" stroke-width="7"/>`;
}

function tupletGlyph(count: number): string {
  const spacing = count > 5 ? 11 : 15;
  const start = 72 - ((count - 1) * spacing) / 2;
  const dots = Array.from({ length: count }, (_, index) =>
    `<circle cx="${start + index * spacing}" cy="94" r="${count > 6 ? 4 : 5}" stroke="none"/>`,
  ).join("");
  return `<path d="M24 57V40H120V57" fill="none" stroke-width="7"/>${dots}`;
}

function measureInsertGlyph(edge: "left" | "right", multiple: boolean): string {
  const x = edge === "left" ? 39 : 105;
  const plusX = edge === "left" ? 100 : 44;
  const pages = multiple
    ? `<rect x="${edge === "left" ? 45 : 57}" y="37" width="${edge === "left" ? 58 : 42}" height="70" fill="none" stroke-width="6" opacity="0.6"/>`
    : "";
  return `${pages}<rect x="28" y="28" width="88" height="88" fill="none" stroke-width="7"/><path d="M${x} 28V116" fill="none" stroke-width="10"/><path d="M${plusX - 14} 72H${plusX + 14}M${plusX} 58V86" fill="none" stroke-width="7"/>`;
}

function paletteGlyph(kind: "grid" | "search" | "master"): string {
  const grid = `<rect x="28" y="29" width="73" height="86" rx="6" fill="none" stroke-width="7"/><path d="M43 48H86M43 69H86M43 90H75" fill="none" stroke-width="7"/>`;
  if (kind === "search") {
    return `${grid}<circle cx="103" cy="101" r="18" fill="none" stroke-width="7"/><path d="M116 114L129 127" fill="none" stroke-width="7"/>`;
  }
  if (kind === "master") {
    return `${grid}<circle cx="103" cy="101" r="18" fill="none" stroke-width="7"/><path d="M103 88V114M90 101H116" fill="none" stroke-width="6"/>`;
  }
  return `${grid}<path d="M109 29V52H132" fill="none" stroke-width="7"/>`;
}

function officialCommandIcon(commandId: string): string | undefined {
  const names: Record<string, string> = {
    "duration-64": "note-64th", "duration-32": "note-32nd", "duration-16": "note-16th",
    "duration-8": "note-8th", "duration-quarter": "note-quarter", "duration-half": "note-half",
    "duration-whole": "note-whole", "duration-double-whole": "note-whole-double",
    dot: "note-dotted", "double-dot": "note-dotted-2", sharp: "sharp", flat: "flat",
    natural: "natural", "double-sharp": "sharp-double", "double-flat": "flat-double",
    tie: "note-tie", slur: "note-slur", "tuplet-custom": "tuplet-bracketed", flip: "note-flip",
    "voice-1": "voice-1", "voice-2": "voice-2", "voice-3": "voice-3", "voice-4": "voice-4",
    "note-input-toggle": "note-plus", "input-duration": "note-quarter", "input-repitch-toggle": "re-pitch",
    "input-insert-toggle": "note-to-right", "zoom-in": "zoom-in", "zoom-out": "zoom-out",
    play: "play", stop: "stop", mixer: "mixer", save: "save", metronome: "metronome", rewind: "rewind",
    staccato: "staccato", accent: "accent", marcato: "marcato", tenuto: "tenuto",
    "chord-symbol": "chord-symbol",
    measure: "insert-measure", "measure-before-selection": "insert-measure", "measure-after-selection": "insert-measure",
    "measure-start": "insert-measure", "measure-end": "insert-measure",
  };
  const name = names[commandId];
  if (!name) return undefined;
  const content = musescoreGlyph(name, 72, 72, 112);
  return content ? iconSvg(content, "#252a32", "#f1f3f5") : undefined;
}

export function commandIcon(commandId: string): string {
  const official = officialCommandIcon(commandId);
  if (official) return official;

  switch (commandId) {
    case "duration-64":
      return iconSvg(note(4), COLORS.note);
    case "duration-32":
      return iconSvg(note(3), COLORS.note);
    case "duration-16":
      return iconSvg(note(2), COLORS.note);
    case "duration-8":
      return iconSvg(note(1), COLORS.note);
    case "duration-quarter":
      return iconSvg(note(0), COLORS.note);
    case "duration-half":
      return iconSvg(note(0, true), COLORS.note);
    case "duration-whole":
      return iconSvg(note(0, true), COLORS.note, "#7dd3fc");
    case "duration-double-whole":
      return iconSvg(`<ellipse cx="53" cy="88" rx="25" ry="15" fill="none" stroke-width="8" transform="rotate(-18 53 88)"/><ellipse cx="91" cy="88" rx="25" ry="15" fill="none" stroke-width="8" transform="rotate(-18 91 88)"/>`, COLORS.note);
    case "duration-longa":
      return iconSvg(`<rect x="31" y="54" width="27" height="57" rx="7" fill="none" stroke-width="8"/><rect x="86" y="54" width="27" height="57" rx="7" fill="none" stroke-width="8"/><path d="M58 68H86M58 89H86" fill="none" stroke-width="7"/>`, COLORS.note);
    case "dot":
      return iconSvg(`${note(0)}<circle cx="103" cy="95" r="8" fill="${COLORS.notation}" stroke="none"/>`, COLORS.notation);
    case "double-dot":
      return iconSvg(`${note(0)}<circle cx="99" cy="86" r="7" fill="${COLORS.notation}" stroke="none"/><circle cx="116" cy="86" r="7" fill="${COLORS.notation}" stroke="none"/>`, COLORS.notation);
    case "sharp":
      return iconSvg(accidental("♯"), COLORS.notation);
    case "flat":
      return iconSvg(accidental("♭"), COLORS.notation);
    case "natural":
      return iconSvg(accidental("♮"), COLORS.notation);
    case "double-sharp":
      return iconSvg(`<path d="M37 39L107 105M107 39L37 105M37 39V59M37 39H57M107 105V85M107 105H87M107 39V59M107 39H87M37 105V85M37 105H57" fill="none" stroke-width="8"/>`, COLORS.notation);
    case "double-flat":
      return iconSvg(`<path d="M48 26V114M48 67C83 44 86 96 48 108M78 26V114M78 67C113 44 116 96 78 108" fill="none" stroke-width="8"/>`, COLORS.notation);
    case "tie":
      return iconSvg(`<path d="M24 71 C43 113, 101 113, 120 71" fill="none" stroke-width="10"/>`, COLORS.articulation);
    case "slur":
      return iconSvg(`<path d="M18 91 C40 43, 104 43, 126 91" fill="none" stroke-width="9"/>`, COLORS.articulation);
    case "staccato":
      return iconSvg(articulationGlyph("staccato"), COLORS.articulation);
    case "accent":
      return iconSvg(articulationGlyph("accent"), COLORS.articulation);
    case "marcato":
      return iconSvg(articulationGlyph("marcato"), COLORS.articulation);
    case "tenuto":
      return iconSvg(articulationGlyph("tenuto"), COLORS.articulation);
    case "tuplet-2":
      return iconSvg(tupletGlyph(2), COLORS.notation);
    case "tuplet-3":
      return iconSvg(tupletGlyph(3), COLORS.notation);
    case "tuplet-4":
      return iconSvg(tupletGlyph(4), COLORS.notation);
    case "tuplet-5":
      return iconSvg(tupletGlyph(5), COLORS.notation);
    case "tuplet-6":
      return iconSvg(tupletGlyph(6), COLORS.notation);
    case "tuplet-7":
      return iconSvg(tupletGlyph(7), COLORS.notation);
    case "tuplet-8":
      return iconSvg(tupletGlyph(8), COLORS.notation);
    case "tuplet-9":
      return iconSvg(tupletGlyph(9), COLORS.notation);
    case "tuplet-custom":
      return iconSvg(`<path d="M25 52V39H119V52" fill="none" stroke-width="7"/><path d="M72 66L79 80L94 82L83 92L86 107L72 100L58 107L61 92L50 82L65 80Z" fill="none" stroke-width="6"/>`, COLORS.notation);
    case "flip":
      return iconSvg(`<path d="M72 27V117M72 27L57 43M72 27L87 43M72 117L57 101M72 117L87 101" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "voice-1":
      return iconSvg(voiceGlyph(1), COLORS.utility);
    case "voice-2":
      return iconSvg(voiceGlyph(2), COLORS.utility);
    case "voice-3":
      return iconSvg(voiceGlyph(3), COLORS.utility);
    case "voice-4":
      return iconSvg(voiceGlyph(4), COLORS.utility);
    case "note-input-toggle":
      return iconSvg(`${note(0, false, COLORS.utility)}<path d="M105 47L124 66L105 85" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "input-duration":
      return iconSvg(`${note(0, true, COLORS.utility)}<path d="M101 48L120 67L101 86" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "input-repitch-toggle":
      return iconSvg(`<path d="M48 54C30 68 32 96 53 108C75 120 101 108 105 87M105 87L88 89M105 87L100 103" fill="none" stroke-width="8"/>${note(0, false, COLORS.utility)}`, COLORS.utility);
    case "input-insert-toggle":
      return iconSvg(`${note(0, false, COLORS.utility)}<path d="M104 34V119M78 93L104 119L130 93" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "selection-mode":
      return iconSvg(`<path d="M39 27 L101 53 L76 61 L89 102 L76 107 L63 67 L46 84 Z" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "repeat-selection":
      return iconSvg(`${text("R", 68, 99, COLORS.utility)}<path d="M32 33 H103 M103 33 L91 23 M103 33 L91 43" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "insert-before-one":
      return iconSvg(measureInsertGlyph("left", false), COLORS.utility);
    case "insert-before-n":
      return iconSvg(measureInsertGlyph("left", true), COLORS.utility);
    case "insert-end-one":
      return iconSvg(measureInsertGlyph("right", false), COLORS.utility);
    case "insert-end-n":
      return iconSvg(measureInsertGlyph("right", true), COLORS.utility);
    case "delete-selected-measures":
      return iconSvg(`<rect x="30" y="31" width="84" height="82" fill="none" stroke-width="7"/><path d="M49 51 L95 97 M95 51 L49 97" fill="none" stroke-width="9"/>`, COLORS.utility);
    case "zoom-in":
      return iconSvg(`<circle cx="62" cy="62" r="29" fill="none" stroke-width="9"/><path d="M84 84 L119 119" fill="none" stroke-width="10"/><path d="M62 47 V77 M47 62 H77" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "zoom-out":
      return iconSvg(`<circle cx="62" cy="62" r="29" fill="none" stroke-width="9"/><path d="M84 84 L119 119" fill="none" stroke-width="10"/><path d="M47 62 H77" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "play-stop":
      return iconSvg(`<path d="M31 28 L84 72 L31 116 Z" stroke="none"/><rect x="96" y="42" width="18" height="60" rx="3" stroke="none"/>`, COLORS.utility);
    case "play":
      return iconSvg(`<path d="M39 28 L109 72 L39 116 Z" stroke="none"/>`, COLORS.utility);
    case "stop":
      return iconSvg(`<rect x="38" y="38" width="68" height="68" rx="5" stroke="none"/>`, COLORS.utility);
    case "mixer":
      return iconSvg(`<path d="M35 34 V110 M72 34 V110 M109 34 V110" fill="none" stroke-width="7"/><rect x="24" y="49" width="22" height="16" rx="5" stroke="none"/><rect x="61" y="79" width="22" height="16" rx="5" stroke="none"/><rect x="98" y="55" width="22" height="16" rx="5" stroke="none"/>`, COLORS.utility);
    case "show-palettes":
      return iconSvg(paletteGlyph("grid"), COLORS.utility);
    case "master-palette":
      return iconSvg(paletteGlyph("master"), COLORS.utility);
    case "palette-grace-notes":
      return categoryIcon(`<ellipse cx="44" cy="102" rx="15" ry="10"/><ellipse cx="94" cy="84" rx="15" ry="10"/><path d="M59 99V46 M109 81V29 M59 46H109 M59 46C77 47 94 53 109 61" fill="none" stroke-width="8"/>`, COLORS.note);
    case "palette-lines":
      return categoryIcon(`<path d="M28 43H116 M28 62H116 M28 81H116 M28 100H116" fill="none" stroke-width="8"/><path d="M45 35V108" fill="none" stroke-width="7"/>`, COLORS.notation);
    case "palette-breaths":
      return categoryIcon(`<path d="M30 72Q72 27 114 72" fill="none" stroke-width="10"/><circle cx="72" cy="98" r="11" stroke="none"/>`, COLORS.notation);
    case "palette-arpeggios":
      return categoryIcon(`<path d="M51 29C96 40 51 52 96 64C51 76 96 88 51 100C75 106 88 111 88 117" fill="none" stroke-width="8"/><path d="M88 117l-13-13M88 117l2-18" fill="none" stroke-width="7"/>`, COLORS.notation);
    case "palette-clefs":
      return categoryIcon(`<path d="M27 50H117 M27 70H117 M27 90H117" fill="none" stroke-width="5"/><path d="M82 28C62 31 59 50 73 59C89 69 98 52 87 42C74 31 58 46 62 64C66 82 83 83 82 101C81 119 61 123 47 111" fill="none" stroke-width="8"/>`, COLORS.notation);
    case "palette-key-signatures":
      return categoryIcon(`<path d="M49 31L43 109 M79 31L73 109 M34 59L88 51 M31 81L85 73" fill="none" stroke-width="7"/>`, COLORS.notation);
    case "palette-time-signatures":
      return categoryIcon(`${text("4/4", 52, 102, "#f8fafc")}`, COLORS.notation);
    case "palette-tempo":
      return categoryIcon(`<ellipse cx="45" cy="96" rx="13" ry="9"/><path d="M57 93V42H101 M101 42V73" fill="none" stroke-width="8"/>${text("=", 35, 107, "#f8fafc")}`, COLORS.text);
    case "palette-dynamics":
      return categoryIcon(`${text("mf", 70, 104, "#f8fafc")}`, COLORS.text);
    case "palette-text":
      return categoryIcon(`<path d="M37 43H107M37 64H96M37 85H107M37 106H82" fill="none" stroke-width="8"/><path d="M108 81V115M95 102H121" fill="none" stroke-width="7"/>`, COLORS.text);
    case "palette-repeats":
      return categoryIcon(`<path d="M42 31V113 M101 31V113" fill="none" stroke-width="9"/><path d="M29 51H93 M93 51L80 39 M93 51L80 63 M115 93H51 M51 93L64 81 M51 93L64 105" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "palette-barlines":
      return categoryIcon(`<path d="M47 27V117 M63 27V117 M91 27V117 M106 27V117" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "palette-layout":
      return categoryIcon(`<path d="M28 43H116 M28 86H84" fill="none" stroke-width="8"/><path d="M84 43V111 M84 111L68 95 M84 111L100 95" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "save":
      return iconSvg(`<path d="M30 24 H98 L114 40 V118 H30 Z" fill="none" stroke-width="8"/><path d="M47 27 V59 H91 V27" fill="none" stroke-width="7"/><rect x="49" y="79" width="45" height="32" rx="3" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "save-as":
      return iconSvg(`<path d="M30 24 H98 L114 40 V118 H30 Z" fill="none" stroke-width="8"/><path d="M47 27 V59 H91 V27" fill="none" stroke-width="7"/><rect x="49" y="79" width="45" height="32" rx="3" fill="none" stroke-width="7"/>${text("+", 34, 44, COLORS.text)}`, COLORS.utility);
    case "fill-slashes":
      return iconSvg(`<path d="M31 106 L52 38 M58 106 L79 38 M85 106 L106 38" fill="none" stroke-width="10"/>`, COLORS.notation);
    case "toggle-rhythmic-slash":
      return iconSvg(`<path d="M31 106L52 38M58 106L79 38M85 106L106 38" fill="none" stroke-width="10"/><path d="M29 30H115M29 30L43 20M29 30L43 40M115 30L101 20M115 30L101 40" fill="none" stroke-width="6"/>`, COLORS.notation);
    case "explode":
      return iconSvg(`<path d="M72 72 L32 32 M72 72 L112 32 M72 72 L32 112 M72 72 L112 112" fill="none" stroke-width="8"/><circle cx="72" cy="72" r="12" stroke="none"/>`, COLORS.notation);
    case "implode":
      return iconSvg(`<path d="M32 32 L72 72 M112 32 L72 72 M32 112 L72 72 M112 112 L72 72" fill="none" stroke-width="8"/><circle cx="72" cy="72" r="12" stroke="none"/>`, COLORS.notation);
    case "page-settings":
      return iconSvg(`<path d="M32 25 H91 L112 46 V119 H32 Z" fill="none" stroke-width="8"/><path d="M90 25 V48 H112" fill="none" stroke-width="7"/><circle cx="72" cy="83" r="19" fill="none" stroke-width="7"/><path d="M72 57 V65 M72 101 V109 M46 83 H54 M90 83 H98" fill="none" stroke-width="7"/>`, COLORS.utility);
    case "metronome":
      return iconSvg(`<path d="M45 111 L59 34 H85 L99 111 Z" fill="none" stroke-width="8"/><path d="M72 61 L103 38" fill="none" stroke-width="8"/><circle cx="103" cy="38" r="8" stroke="none"/><path d="M51 111 H105" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "rewind":
      return iconSvg(`<path d="M112 31 L62 72 L112 113 Z M67 31 L17 72 L67 113 Z" stroke="none"/>`, COLORS.utility);
    case "chord-symbol":
      return iconSvg(`<ellipse cx="49" cy="92" rx="18" ry="11"/><ellipse cx="95" cy="72" rx="18" ry="11"/><path d="M67 88V40M113 68V27M67 40H113" fill="none" stroke-width="8"/>`, COLORS.text);
    case "dynamic-text":
      return iconSvg(`<path d="M28 72L72 45L116 72L72 99Z" fill="none" stroke-width="8"/><path d="M45 72H99" fill="none" stroke-width="6"/>`, COLORS.text);
    case "measure-before-selection":
      return iconSvg(`${measureInsertGlyph("left", true)}<rect x="53" y="20" width="38" height="20" rx="5" fill="currentColor" stroke="none"/><circle cx="63" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="72" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="81" cy="30" r="3" fill="currentColor" stroke="none"/>`, COLORS.utility);
    case "measure-after-selection":
      return iconSvg(`${measureInsertGlyph("right", true)}<rect x="53" y="20" width="38" height="20" rx="5" fill="currentColor" stroke="none"/><circle cx="63" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="72" cy="30" r="3" fill="currentColor" stroke="none"/><circle cx="81" cy="30" r="3" fill="currentColor" stroke="none"/>`, COLORS.utility);
    case "measure-start":
      return iconSvg(`<rect x="34" y="28" width="76" height="88" fill="none" stroke-width="7"/><path d="M48 28V116M48 72H101M101 72L88 59M101 72L88 85" fill="none" stroke-width="8"/>`, COLORS.utility);
    case "measure-end":
      return iconSvg(`<rect x="34" y="28" width="76" height="88" fill="none" stroke-width="7"/><path d="M96 28V116M43 72H96M43 72L56 59M43 72L56 85" fill="none" stroke-width="8"/>`, COLORS.utility);
    default:
      return iconSvg(text("MS", 42, 98), "#64748b");
  }
}
