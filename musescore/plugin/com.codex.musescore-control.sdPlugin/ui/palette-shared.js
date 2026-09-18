import { smuflGlyph } from "./official-smufl.js";
import { musescoreGlyph } from "./official-musescore-icons.js";

const COLORS = {
  note: "#38bdf8",
  ornament: "#fb7185",
  line: "#c084fc",
  notation: "#818cf8",
  text: "#fbbf24",
  utility: "#34d399",
};

const item = (id, label, query = label) => ({ id, label, query });
const category = (id, label, color, items) => ({ id, label, color, items });
const TEMPO_SWING_LABEL = "Swing";
const TEMPO_STRAIGHT_LABEL = "Straight";

/** MuseScore Studio の既定パレット順。 */
export const paletteCategories = [
  category("grace-notes", "装飾音符", COLORS.note, [
    item("slash-8", "スラッシュ付き8分音符"),
    item("grace-16", "16分音符"),
    item("grace-32", "32分音符"),
  ]),
  category("ornaments", "装飾記号", COLORS.ornament, [
    item("trill", "トリル"), item("mordent", "モルデント"),
    item("inverted-mordent", "逆モルデント"), item("turn", "ターン"),
    item("inverted-turn", "逆ターン"),
  ]),
  category("tremolos", "トレモロ", COLORS.ornament, [
    item("tremolo-1", "8分音符で反復"), item("tremolo-2", "16分音符で反復"),
    item("tremolo-3", "32分音符で反復"), item("tremolo-4", "64分音符で反復"),
    item("buzz-roll", "バズロール"), item("alternating-8", "8分音符で交互に演奏"),
    item("alternating-16", "16分音符で交互に演奏"), item("alternating-32", "32分音符で交互に演奏"),
    item("alternating-64", "64分音符で交互に演奏"), item("split-2", "トレモロを2つに分ける"),
    item("split-3", "トレモロを3つに分ける"), item("split-4", "トレモロを4つに分ける"),
    item("split-6", "トレモロを6つに分ける"),
  ]),
  category("guitar", "ギター", "#fb923c", [
    item("barre-line", "バレー線"), item("palm-mute", "パームミュート", "P.M."),
    item("let-ring", "レットリング", "let ring"), item("whammy-bar", "ワーミーバー"),
    item("guitar-vibrato", "ギタービブラート"), item("wide-guitar-vibrato", "幅広ギタービブラート"),
    item("dive", "ダイブ"), item("pre-dive", "プレダイブ"), item("dip", "ディップ"), item("scoop", "スクープ"),
    item("bend", "標準のベンド"), item("pre-bend", "プレベンド"), item("grace-bend", "装飾音符ベンド"),
    item("slide-bend", "スライトベンド"), item("right-p", "ギター右手運指 p"), item("right-i", "ギター右手運指 i"),
    item("right-m", "ギター右手運指 m"), item("right-a", "ギター右手運指 a"), item("right-c", "ギター右手運指 c"),
    ...["0", "1", "2", "3", "4", "5", "T"].map((finger) => item(`left-${finger}`, `ギター左手運指 ${finger}`)),
    ...["1", "2", "3", "4", "5", "6"].map((string) => item(`string-${string}`, `弦番 ${string}`)),
    item("left-hand-tap", "左手タッピング"), item("right-hand-tap", "右手タッピング"),
    item("hammer-pull", "ハンマリング / プリング"), item("thumb-position", "親指位置"),
    item("right-thumb", "右手運指、親指"), item("right-index", "右手運指、人差指"),
    item("right-middle", "右手運指、中指"), item("right-ring", "右手運指、薬指"),
    item("capo", "Capo"), item("tuning", "調弦"), item("distortion", "ディストーション"),
  ]),
  category("lines", "線", COLORS.line, [
    item("volta-1", "1番括弧"), item("volta-2", "2番括弧"),
    item("volta-2-open", "2番括弧、開放型"),
    item("staff-line", "譜表線", "staff"), item("system-line", "段線", "system"),
    item("8va", "8va"), item("8vb", "8vb"), item("15ma", "15ma", "15va"), item("15mb", "15mb", "15vb"),
  ]),
  category("breaths", "ブレスと休止", COLORS.line, [
    item("fermata", "フェルマータ"), item("caesura", "カエスーラ"),
  ]),
  category("arpeggios", "アルペジオとグリッサンド", COLORS.note, [
    item("arpeggio", "アルペジオ"), item("arpeggio-up", "上向きアルペジオ"),
    item("arpeggio-down", "下向きアルペジオ"),
    item("straight-arpeggio-up", "直線上向きアルペジオ"),
    item("straight-arpeggio-down", "直線下向きアルペジオ"),
    item("straight-glissando", "直線グリッサンド"),
    item("wavy-glissando", "波線グリッサンド"),
    item("fall", "フォール"), item("doit", "ドゥイット"), item("plop", "プロップ"), item("scoop", "スクープ"),
    item("slide-out-down", "スライド アウト ダウン"),
    item("slide-out-up", "スライド アウト アップ"),
    item("slide-in-above", "スライド イン アバブ"),
    item("slide-in-below", "スライド イン ビロウ"),
    item("slide-out-down-rough", "Slide out down (rough)"),
    item("slide-out-up-rough", "Slide out up (rough)"),
    item("slide-in-above-rough", "Slide in above (rough)"),
    item("slide-in-below-rough", "Slide in below (rough)"),
  ]),
  category("clefs", "音部記号", COLORS.notation, [
    item("treble", "ト音記号"), item("bass", "ヘ音記号"),
    item("treble-8va", "ト音記号 8va"), item("treble-8vb", "ト音記号 8vb"),
    item("treble-15va", "ト音記号 15va"), item("treble-15vb", "ト音記号 15vb"),
    item("bass-8va", "ヘ音記号 8va"), item("bass-8vb", "ヘ音記号 8vb"),
    item("bass-15va", "ヘ音記号 15va"), item("bass-15vb", "ヘ音記号 15vb"),
    item("alto", "ハ音記号"),
  ]),
  category("key-signatures", "調号", COLORS.notation, [
    item("key-s1", "ト長調 (Gメジャー) / ホ短調 (Eマイナー)"), item("key-s2", "ニ長調 (Dメジャー) / ロ短調 (Bマイナー)"),
    item("key-s3", "イ長調 (Aメジャー) / 嬰ヘ短調 (F♯マイナー)"), item("key-s4", "ホ長調 (Eメジャー) / 嬰ハ短調 (C♯マイナー)"),
    item("key-s5", "ロ長調 (Bメジャー) / 嬰ト短調 (G♯マイナー)"), item("key-s6", "嬰ヘ長調 (F♯メジャー) / 嬰ニ短調 (D♯マイナー)"),
    item("key-s7", "嬰ハ長調 (C♯メジャー) / 嬰イ短調 (A♯マイナー)"), item("key-f7", "変ハ長調 (C♭メジャー) / 変イ短調 (A♭マイナー)"),
    item("key-f6", "変ト長調 (G♭メジャー) / 変ホ短調 (E♭マイナー)"), item("key-f5", "変ニ長調 (D♭メジャー) / 変ロ短調 (B♭マイナー)"),
    item("key-f4", "変イ長調 (A♭メジャー) / ヘ短調 (Fマイナー)"), item("key-f3", "変ホ長調 (E♭メジャー) / ハ短調 (Cマイナー)"),
    item("key-f2", "変ロ長調 (B♭メジャー) / ト短調 (Gマイナー)"), item("key-f1", "ヘ長調 (Fメジャー) / ニ短調 (Dマイナー)"),
    item("key-0", "ハ長調 (Cメジャー) / イ短調 (Aマイナー)"), item("key-atonal", "不定 / 無調"),
  ]),
  category("time-signatures", "拍子記号", COLORS.notation, [
    item("time-2-2", "2/2", "2/2"), item("time-2-4", "2/4", "2/4"),
    item("time-3-4", "3/4", "3/4"), item("time-4-4", "4/4", "4/4"),
    item("time-5-4", "5/4", "5/4"), item("time-6-4", "6/4", "6/4"),
    item("time-3-8", "3/8", "3/8"), item("time-6-8", "6/8", "6/8"),
    item("time-9-8", "9/8", "9/8"), item("time-12-8", "12/8", "12/8"),
    item("common-time", "コモンタイム", "コモンタイム"), item("cut-time", "アラ・ブレーヴェ", "アラ・ブレーヴェ"),
  ]),
  category("tempo", "テンポ", COLORS.text, [
    item("tempo-quarter", "4分音符 =", "4分音符 ="), item("tempo-eighth", "8分音符 =", "8分音符 ="),
    item("tempo-half", "2分音符 =", "2分音符 ="), item("swing", TEMPO_SWING_LABEL, TEMPO_SWING_LABEL),
    item("straight", TEMPO_STRAIGHT_LABEL, TEMPO_STRAIGHT_LABEL), item("rit", "rit.", "rit."),
    item("a-tempo", "a tempo", "a tempo"), item("accel", "accel.", "accel."), item("rall", "rall.", "rall."),
  ]),
  category("accidentals", "臨時記号", COLORS.notation, [
    item("sharp", "シャープ"), item("flat", "フラット"), item("natural", "ナチュラル"),
    item("double-sharp", "ダブルシャープ"), item("double-flat", "ダブルフラット"),
  ]),
  category("dynamics", "強弱記号", COLORS.ornament, [
    ...["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff", "fp", "sffz"].map((mark) => item(`dynamic-${mark}`, mark, mark)),
    item("cresc", "cresc.", "cresc."), item("dim", "dim.", "dim."),
    item("hairpin-cresc", "クレッシェンド・ヘアピン", "cresc hairpin"),
    item("hairpin-dim", "ディミヌエンド・ヘアピン", "dim hairpin"),
  ]),
  category("articulations", "アーティキュレーション", COLORS.ornament, [
    item("staccato", "スタッカート"), item("accent", "アクセント"), item("marcato", "マルカート"),
    item("tenuto", "テヌート"), item("staccatissimo", "スタッカティッシモ"), item("portato", "ポルタート"),
  ]),
  category("text", "テキスト", COLORS.text, [
    item("staff-text", "譜表テキスト"), item("system-text", "段テキスト"), item("expression", "発想標語テキスト"),
    item("rehearsal", "練習番号"), item("mute", "mute"), item("open", "open"),
    item("instrument-change", "楽器の変更"), item("pizz", "ピッツィカート"), item("arco", "Arco"),
  ]),
  category("keyboard", "鍵盤", COLORS.utility, [
    item("pedal", "ペダル", "Ped."), item("pedal-release", "ペダル解除", "ペダル解除"),
    item("sostenuto", "ソステヌート", "Sost. Ped."), item("una-corda", "ウナ・コルダ", "una corda"),
  ]),
  category("repeats", "繰り返しとジャンプ", COLORS.utility, [
    item("repeat-1", "1小節リピート", "直前の小節を繰り返す"),
    item("repeat-2", "2小節リピート", "直前の小節を繰り返す"),
    item("repeat-4", "4小節リピート", "直前の小節を繰り返す"),
    item("segno", "セーニョ"), item("coda", "コーダ"), item("fine", "Fine", "Fine"),
    item("to-coda", "To Coda", "To Coda"), item("dc", "D.C.", "D.C."), item("ds", "D.S.", "D.S."),
    item("repeat-start", "反復開始", "繰り返し開始"), item("repeat-end", "反復終了", "繰り返し終了"),
    item("repeat-both", "反復終了・開始", "繰り返し開始 終了"),
  ]),
  category("barlines", "縦線", COLORS.utility, [
    item("barline", "小節線"), item("double-barline", "複縦線"),
    item("dashed-barline", "破線"), item("final-barline", "終止線"),
  ]),
  category("layout", "レイアウト", COLORS.utility, [
    item("system-break", "段区切り"), item("page-break", "ページ区切り"), item("section-break", "セクション区切り"),
  ]),
];

export const paletteCategoryMap = Object.fromEntries(paletteCategories.map((value) => [value.id, value]));

export function categoryIdFromAction(actionId) {
  return actionId.startsWith("com.codex.musescore-control.palette.")
    ? actionId.slice("com.codex.musescore-control.palette.".length)
    : "";
}

export function findPaletteItem(categoryId, itemId) {
  return paletteCategoryMap[categoryId]?.items.find((value) => value.id === itemId);
}

export function findPaletteItemByQuery(categoryId, query = "") {
  const normalized = query.trim().toLocaleLowerCase("ja");
  if (!normalized) return undefined;
  return paletteCategoryMap[categoryId]?.items.find((value) =>
    value.query.toLocaleLowerCase("ja") === normalized || value.label.toLocaleLowerCase("ja") === normalized,
  );
}

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const label = (value, size = 46, y = 88, family = "Arial, sans-serif") =>
  `<text x="72" y="${y}" text-anchor="middle" font-family="${family}" font-size="${size}" font-weight="700" fill="currentColor">${esc(value)}</text>`;
const path = (d, width = 7, extra = "") => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const staff = () => [40, 56, 72, 88, 104].map((y) => `<path d="M18 ${y}H126" stroke="currentColor" stroke-width="2"/>`).join("");
const note = (flags = 0, hollow = false, x = 61) => {
  const head = `<ellipse cx="${x}" cy="91" rx="19" ry="12" transform="rotate(-18 ${x} 91)" ${hollow ? 'fill="none" stroke="currentColor" stroke-width="6"' : 'fill="currentColor"'}/>`;
  const stem = path(`M${x + 17} 88V31`, 7);
  const tails = Array.from({ length: flags }, (_, i) => path(`M${x + 17} ${34 + i * 16}C105 ${37 + i * 16} 105 ${53 + i * 16} ${x + 23} ${60 + i * 16}`, 7)).join("");
  return `${head}${stem}${tails}`;
};
const articulationGlyph = (code) => smuflGlyph(code, 72, 72, 80);
const accidentalGlyph = (kind, x = 72, y = 72, scale = 1) => {
  const shapes = {
    sharp: `${path("M-10 -39V39M10 -39V39M-24 -15L24 -24M-24 20L24 11", 7)}`,
    flat: `${path("M-8 -42V38M-8 3C25 -16 27 31 -8 38", 7)}`,
    natural: `${path("M-10 -38V24M10 -24V38M-10 -2L10 -10M-10 23L10 15", 7)}`,
    "double-sharp": `${path("M-24 -27L24 27M24 -27L-24 27M-24 -27V-12M-24 -27H-9M24 27V12M24 27H9M24 -27V-12M24 -27H9M-24 27V12M-24 27H-9", 6)}`,
  };
  if (kind === "double-flat") return `<g transform="translate(${x - 13} ${y}) scale(${scale})">${path("M-8 -42V38M-8 3C25 -16 27 31 -8 38", 7)}</g><g transform="translate(${x + 13} ${y}) scale(${scale})">${path("M-8 -42V38M-8 3C25 -16 27 31 -8 38", 7)}</g>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${shapes[kind] || shapes.natural}</g>`;
};
const clefGlyph = (kind) => {
  return smuflGlyph(kind === "bass" ? "e062" : kind === "alto" ? "e05c" : "e050", 72, 72, 102);
};
const bracket = (rightClosed = true) => path(`M25 104V39H119${rightClosed ? "V57" : ""}`, 7);

function keySignature(id) {
  if (id === "key-0") return staff();
  if (id === "key-atonal") return `${staff()}${path("M47 48L97 96M97 48L47 96", 8)}`;
  const sharp = id.startsWith("key-s");
  const count = Number(id.slice(5));
  const positions = sharp ? [48, 76, 38, 66, 94, 56, 84] : [84, 56, 94, 66, 104, 76, 114];
  return `${staff()}${Array.from({ length: count }, (_, i) => smuflGlyph(sharp ? "e262" : "e260", 31 + i * 14, positions[i] - 8, 82)).join("")}`;
}

function arpeggioOrBend(id) {
  if (id === "arpeggio") return smuflGlyph("e63c", 72, 72, 96);
  if (id === "arpeggio-up") return smuflGlyph("e634", 72, 72, 112);
  if (id === "arpeggio-down") return smuflGlyph("e635", 72, 72, 112);
  if (id === "straight-arpeggio-up") return `${path("M72 116V28", 7)}${path("M72 28L58 45M72 28L86 45", 7)}`;
  if (id === "straight-arpeggio-down") return `${path("M72 28V116", 7)}${path("M72 116L58 99M72 116L86 99", 7)}`;
  if (id === "straight-glissando") return musescoreGlyph("glissando", 72, 72, 112);
  if (id === "wavy-glissando") return smuflGlyph("eaaf", 72, 72, 112);
  const rough = id.endsWith("-rough");
  const base = id.replace(/-rough$/, "");
  const map = {
    // MuseScore's palette uses compact, line-only brass bends here.  Keep the
    // diagonal curves legible at key size instead of substituting full SMuFL
    // brass glyphs with large terminals and note-like shapes.
    fall: "M30 43C56 43 78 62 114 108",
    doit: "M30 101C59 101 82 80 114 36",
    plop: "M30 36C57 56 82 82 114 104",
    scoop: "M30 106C58 84 82 58 114 40",
    "slide-out-down": "M30 48H78L114 104",
    "slide-out-up": "M30 96H78L114 40",
    "slide-in-above": "M30 40L66 92H114",
    "slide-in-below": "M30 104L66 52H114",
  };
  const d = map[base] || map.fall;
  return path(d, rough ? 9 : 7, rough ? 'stroke-dasharray="5 8"' : "");
}

/** MuseScore公式UIアイコンフォントで描ける項目は、実アプリと同じ輪郭を使う。 */
function officialPaletteGlyph(categoryId, itemId) {
  const glyph = (name, size = 108) => musescoreGlyph(name, 72, 72, size);
  if (categoryId === "grace-notes") {
    return itemId === "slash-8" ? glyph("acciaccatura", 112) : glyph(itemId === "grace-32" ? "grace-32" : "grace-16", 112);
  }
  // These palettes have per-item SMuFL glyphs; the UI font's generic category
  // glyph would erase the distinction between the cards.
  if (categoryId === "ornaments" || categoryId === "tremolos") return "";
  if (categoryId === "guitar") {
    const names = {
      "palm-mute": "palm-mute", "let-ring": "let-ring", dive: "guitar-dive", "pre-dive": "guitar-pre-dive",
      dip: "guitar-dip-down", scoop: "guitar-scoop",
    };
    return names[itemId] ? glyph(names[itemId], 110) : "";
  }
  if (categoryId === "breaths") {
    if (itemId === "fermata") return glyph("fermata", 112);
    if (itemId === "caesura") return smuflGlyph("e4d1", 72, 72, 112);
  }
  if (categoryId === "clefs") {
    if (itemId === "treble") return glyph("clef-treble", 112);
    if (itemId === "bass") return glyph("bass-clef", 112);
  }
  if (categoryId === "key-signatures") {
    if (itemId === "key-0") return glyph("key-none", 112);
    const count = Number(itemId.slice(5));
    const kind = itemId.startsWith("key-s") ? "sharp" : "flat";
    if (count >= 1 && count <= 7) return glyph(`key-${kind}-${count}`, 112);
  }
  if (categoryId === "accidentals") {
    const names = { sharp: "sharp", flat: "flat", natural: "natural", "double-sharp": "sharp-double", "double-flat": "flat-double" };
    return names[itemId] ? glyph(names[itemId], 112) : "";
  }
  if (categoryId === "dynamics") {
    const dynamicCodes = {
      "dynamic-ppp": "e52a", "dynamic-pp": "e52b", "dynamic-p": "e520",
      "dynamic-mp": "e52c", "dynamic-mf": "e52d", "dynamic-f": "e522",
      "dynamic-ff": "e52f", "dynamic-fff": "e530", "dynamic-fp": "e534",
      "dynamic-sffz": "e537", cresc: "e53e", dim: "e53f",
      "hairpin-cresc": "e53e", "hairpin-dim": "e53f",
    };
    if (dynamicCodes[itemId]) return smuflGlyph(dynamicCodes[itemId], 72, 72, 96);
  }
  if (categoryId === "articulations") {
    const names = { staccato: "staccato", accent: "accent", marcato: "marcato", tenuto: "tenuto" };
    if (!names[itemId]) return "";
    const code = { staccato: "e4a2", accent: "e4a0", marcato: "e4ac", tenuto: "e4a4" }[itemId];
    return smuflGlyph(code, 72, 72, itemId === "staccato" ? 56 : 80);
  }
  if (categoryId === "text") {
    const names = { "staff-text": "text-above-staff", "system-text": "text-below-staff", expression: "expression", mute: "mute" };
    return names[itemId] ? glyph(names[itemId], 112) : "";
  }
  if (categoryId === "keyboard" && itemId === "pedal") return glyph("pedal-marking", 112);
  if (categoryId === "repeats") {
    // Keep the number and direction visible in the per-item SMuFL fallback.
    if (itemId.startsWith("repeat-") && /[124]/.test(itemId)) return "";
    if (["repeat-start", "repeat-end", "repeat-both"].includes(itemId)) return "";
  }
  if (categoryId === "barlines") {
    return "";
  }
  if (categoryId === "layout") {
    const names = { "system-break": "line-break", "page-break": "page-break", "section-break": "section-break-2" };
    return names[itemId] ? glyph(names[itemId], 112) : "";
  }
  return "";
}

/** 144px Stream Deck key 用の単純な記譜アイコン。 */
export function paletteIcon(categoryId, itemId = "") {
  const categoryValue = paletteCategoryMap[categoryId];
  let content = "";

  const officialContent = officialPaletteGlyph(categoryId, itemId);
  if (officialContent) content = officialContent;

  if (!content && categoryId === "grace-notes") {
    const flags = itemId === "grace-32" ? 3 : 2;
    content = `${smuflGlyph("e0a4", 61, 91, 52)}${path("M78 88V31", 7)}${Array.from({ length: flags }, (_, i) => path(`M78 ${34 + i * 16}C105 ${37 + i * 16} 105 ${53 + i * 16} 84 ${60 + i * 16}`, 7)).join("")}`;
  } else if (!content && categoryId === "ornaments") {
    const ornamentCode = itemId === "trill" ? "e566" : itemId === "turn" ? "e567" : itemId === "inverted-turn" ? "e568" : itemId === "mordent" ? "e56d" : "e56e";
    content = smuflGlyph(ornamentCode, 72, 72, 108);
  } else if (!content && categoryId === "tremolos") {
    const alternating = itemId.startsWith("alternating-");
    const splitCount = itemId.startsWith("split-") ? Number(itemId.slice(-1)) : 0;
    const count = itemId === "tremolo-1" || itemId === "alternating-8" ? 1
      : itemId === "tremolo-2" || itemId === "alternating-16" ? 2
        : itemId === "tremolo-3" || itemId === "alternating-32" ? 3
          : itemId === "tremolo-4" || itemId === "alternating-64" ? 4
            : splitCount || itemId === "buzz-roll" ? (splitCount || 5) : 3;
    const stems = alternating ? [43, 101]
      : splitCount ? Array.from({ length: splitCount }, (_, i) => 28 + i * (88 / Math.max(1, splitCount - 1))) : [72];
    const stemContent = stems.map((x) => path(`M${x} 34V116`, 6)).join("");
    const bars = Array.from({ length: count }, (_, i) => {
      const y = 40 + i * 14;
      return alternating ? path(`M35 ${y}L109 ${y + 20}`, 7) : path(`M58 ${y}L86 ${y + 12}`, 7);
    }).join("");
    content = `${stemContent}${bars}`;
  } else if (!content && categoryId === "guitar") {
    const map = {
      "barre-line": `${label("VII", 38, 56, "Georgia, serif")}${path("M27 67H117", 7)}`,
      "whammy-bar": label("w/bar", 35, 91, "Georgia, serif"),
      "guitar-vibrato": `${label("~~~", 44, 76, "Georgia, serif")}${path("M28 103H116", 5)}`,
      "wide-guitar-vibrato": `${label("~~~~", 39, 76, "Georgia, serif")}${path("M28 103H116", 5)}`,
      bend: `${label("B", 57, 76, "Georgia, serif")}${path("M29 106Q72 43 115 106", 7)}`,
      "pre-bend": `${label("PB", 42, 76, "Georgia, serif")}${path("M29 106Q72 43 115 106", 7)}`,
      "grace-bend": `${label("GB", 38, 76, "Georgia, serif")}${path("M29 106Q72 43 115 106", 7)}`,
      "slide-bend": `${label("/", 72, 95, "Georgia, serif")}${path("M29 106Q72 43 115 106", 7)}`,
      "right-p": label("p", 58, 94, "Georgia, serif"), "right-i": label("i", 58, 94, "Georgia, serif"),
      "right-m": label("m", 58, 94, "Georgia, serif"), "right-a": label("a", 58, 94, "Georgia, serif"),
      "right-c": label("c", 58, 94, "Georgia, serif"),
      ...Object.fromEntries(["0", "1", "2", "3", "4", "5", "T"].map((finger) => [`left-${finger}`, label(finger, 58, 94, "Georgia, serif")])),
      ...Object.fromEntries(["1", "2", "3", "4", "5", "6"].map((string) => [`string-${string}`, label(string, 58, 94, "Georgia, serif")])),
      "left-hand-tap": label("L", 48, 76, "Georgia, serif"), "right-hand-tap": label("R", 48, 76, "Georgia, serif"),
      "hammer-pull": label("H/P", 39, 91, "Georgia, serif"), "thumb-position": label("T", 58, 94, "Georgia, serif"),
      "right-thumb": label("p", 58, 94, "Georgia, serif"), "right-index": label("i", 58, 94, "Georgia, serif"),
      "right-middle": label("m", 58, 94, "Georgia, serif"), "right-ring": label("a", 58, 94, "Georgia, serif"),
      capo: label("Capo", 35, 91, "Georgia, serif"), tuning: label("Tune", 35, 91, "Georgia, serif"),
      distortion: label("Dist.", 35, 91, "Georgia, serif"),
      "palm-mute": `${label("P.M.", 37, 76)}${path("M26 99H118", 5, 'stroke-dasharray="8 8"')}`,
      "let-ring": `${path("M25 82C48 43 96 43 119 82", 7)}${label("○", 34, 117)}`,
      capo: `${path("M35 31V113M35 48H112M35 96H112", 8)}${label("×", 34, 85)}`,
      barre: `${path("M30 45H114M39 45V108M106 45V108", 8)}${[48,68,88,108].map((x)=>`<circle cx="${x}" cy="83" r="6" fill="currentColor"/>`).join("")}`,
      tap: `${label("T", 62, 92)}<circle cx="72" cy="112" r="7" fill="currentColor"/>`,
    };
    content = map[itemId] || label("G", 62, 94);
  } else if (!content && categoryId === "lines") {
    if (itemId.startsWith("volta")) content = `${bracket(itemId !== "volta-2-open")}${label(itemId.includes("2") ? "2." : "1.", 34, 81)}`;
    else if (itemId === "staff-line") content = `${staff()}${path("M31 31V113", 6)}`;
    else if (itemId === "system-line") content = `${staff()}${path("M24 26V118M120 26V118", 6)}`;
    else if (itemId.startsWith("8")) content = musescoreGlyph("ottava", 72, 72, 112, itemId.endsWith("vb"));
    else content = `${label(itemId.replace("15m", "15"), 39, 61, "Georgia, serif")}${path("M24 91H118", 5)}${path(itemId.endsWith("b") ? "M118 91V112" : "M24 91V70", 5)}`;
  } else if (!content && categoryId === "breaths") {
    content = smuflGlyph(itemId === "caesura" ? "e4d1" : "e4c0", 72, 72, 108);
  } else if (!content && categoryId === "arpeggios") {
    content = arpeggioOrBend(itemId);
  } else if (!content && categoryId === "clefs") {
    const bass = itemId.startsWith("bass");
    const alto = itemId === "alto";
    const octave = itemId.match(/(8|15)v[ab]$/)?.[1];
    const below = itemId.endsWith("vb");
    const clef = clefGlyph(alto ? "alto" : bass ? "bass" : "treble");
    content = `${staff()}${clef}${octave ? label(octave, 24, below ? 127 : 27) : ""}`;
  } else if (!content && categoryId === "key-signatures") {
    content = keySignature(itemId);
  } else if (!content && categoryId === "time-signatures") {
    if (itemId === "common-time") content = label("C", 78, 101, "Georgia, serif");
    else if (itemId === "cut-time") content = `${label("C", 78, 101, "Georgia, serif")}${path("M72 27V117", 6)}`;
    else {
      const parts = itemId.replace("time-", "").split("-");
      content = `${staff()}${label(parts[0], 42, 70)}${label(parts[1], 42, 111)}`;
    }
  } else if (!content && categoryId === "tempo") {
    if (itemId.startsWith("tempo-")) content = `${note(itemId === "tempo-eighth" ? 1 : 0, itemId === "tempo-half", 46)}${label("=", 36, 88).replace('x="72"', 'x="105"')}`;
    else if (itemId === "swing") content = label("Swing", 39, 91, "Georgia, serif");
    else if (itemId === "straight") content = label("Straight", 32, 91, "Georgia, serif");
    else content = label({ rit: "rit.", "a-tempo": "a t.", accel: "acc.", rall: "rall." }[itemId] || "♩=", 38, 88, "Georgia, serif");
  } else if (!content && categoryId === "accidentals") {
    const accidentalCode = { sharp: "e262", flat: "e260", natural: "e261", "double-sharp": "e263", "double-flat": "e264" }[itemId] || "e261";
    content = smuflGlyph(accidentalCode, 72, 72, 104);
  } else if (!content && categoryId === "dynamics") {
    const dynamicCodes = {
      "dynamic-ppp": "e52a", "dynamic-pp": "e52b", "dynamic-p": "e520",
      "dynamic-mp": "e52c", "dynamic-mf": "e52d", "dynamic-f": "e522",
      "dynamic-ff": "e52f", "dynamic-fff": "e530", "dynamic-fp": "e534",
      "dynamic-sffz": "e537", cresc: "e53e", dim: "e53f",
      "hairpin-cresc": "e53e", "hairpin-dim": "e53f",
    };
    content = dynamicCodes[itemId] ? smuflGlyph(dynamicCodes[itemId], 72, 72, 96) : label(itemId.replace("dynamic-", ""), 50, 95, "Georgia, serif");
  } else if (!content && categoryId === "articulations") {
    const articulationCode = { staccato: "e4a2", accent: "e4a0", marcato: "e4ac", tenuto: "e4a4", staccatissimo: "e4a6", portato: "e4a8" }[itemId] || "e4a2";
    content = smuflGlyph(articulationCode, 72, 72, itemId === "staccato" ? 56 : 80);
  } else if (!content && categoryId === "text") {
    const marks = { mute: "mute", open: "Open", pizz: "pizz.", arco: "Arco" };
    if (marks[itemId]) content = label(marks[itemId], 34, 87, "Georgia, serif");
    else if (itemId === "rehearsal") content = `<rect x="35" y="35" width="74" height="74" rx="8" fill="none" stroke="currentColor" stroke-width="7"/>${label("A", 48, 91)}`;
    else if (itemId === "instrument-change") content = `${label("Instrument", 25, 72, "Arial, sans-serif")}${label("Change", 25, 101, "Arial, sans-serif")}`;
    else content = `${staff()}${label(itemId === "system-text" ? "S" : itemId === "expression" ? "e" : "T", 52, 91, "Georgia, serif")}`;
  } else if (!content && categoryId === "keyboard") {
    if (itemId === "pedal-release") content = `${path("M72 28V116M28 72H116M40 40L104 104M104 40L40 104", 7)}`;
    else content = `${label(itemId === "sostenuto" ? "Sost." : itemId === "una-corda" ? "u.c." : "Ped.", 39, 84, "Georgia, serif")}${path("M24 103H120", 5)}`;
  } else if (!content && categoryId === "repeats") {
    if (itemId.startsWith("repeat-") && /\d/.test(itemId)) content = musescoreGlyph("measure-repeat", 72, 72, 112);
    else if (itemId === "segno") content = smuflGlyph("e047", 72, 72, 112);
    else if (itemId === "coda") content = smuflGlyph("e048", 72, 72, 112);
    else if (["fine", "to-coda", "dc", "ds"].includes(itemId)) content = label({ fine: "Fine", "to-coda": "To Coda", dc: "D.C.", ds: "D.S." }[itemId], itemId === "to-coda" ? 30 : 34, 87, "Georgia, serif");
    else {
      const repeatCode = { "repeat-start": "e040", "repeat-end": "e041", "repeat-both": "e042" }[itemId];
      content = repeatCode ? smuflGlyph(repeatCode, 72, 72, 112) : "";
    }
  } else if (!content && categoryId === "barlines") {
    const lines = itemId === "barline" ? [[72, 6]] : itemId === "double-barline" ? [[61, 5], [83, 5]] : itemId === "final-barline" ? [[57, 5], [85, 11]] : [[72, 5]];
    const barlineCode = itemId === "barline" ? "e030" : itemId === "double-barline" ? "e031" : itemId === "dashed-barline" ? "e036" : "e032";
    content = smuflGlyph(barlineCode, 72, 72, 112);
  } else if (!content && categoryId === "layout") {
    const horizontal = `${path("M23 42H121M23 101H121", 6)}`;
    if (itemId === "system-break") content = `${horizontal}${path("M72 28V82M58 68L72 82L86 68", 7)}`;
    else if (itemId === "page-break") content = `${horizontal}${path("M72 116V61M58 75L72 61L86 75", 7)}`;
    else content = `${horizontal}${path("M72 26V116M55 72H89", 7)}`;
  }

  if (!content) content = `${label(categoryValue?.label?.slice(0, 1) || "♪", 58, 94)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" style="color:#ffffff">
  <defs><filter id="icon-shadow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="blur"/><feOffset in="blur" dx="0" dy="3" result="offsetBlur"/><feFlood flood-color="#000000" flood-opacity="0.9" result="shadowColor"/><feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <g color="#ffffff" fill="#ffffff" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" filter="url(#icon-shadow)">${content}</g>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
