import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";
import { commandIcon } from "../icons.js";
import {
  sendMuseScoreButtonAction,
  sendMuseScoreMenuAction,
  sendMuseScoreMenuPathAction,
  sendMuseScorePaletteSearch,
  sendMuseScoreShortcut,
  type MuseScoreShortcut,
} from "../macos.js";

export type CommandId =
  | "duration-32"
  | "duration-64"
  | "duration-16"
  | "duration-8"
  | "duration-quarter"
  | "duration-half"
  | "duration-whole"
  | "duration-double-whole"
  | "duration-longa"
  | "dot"
  | "double-dot"
  | "sharp"
  | "flat"
  | "natural"
  | "tie"
  | "slur"
  | "staccato"
  | "accent"
  | "marcato"
  | "tenuto"
  | "tuplet-2"
  | "tuplet-3"
  | "tuplet-4"
  | "tuplet-5"
  | "tuplet-6"
  | "tuplet-7"
  | "tuplet-8"
  | "tuplet-9"
  | "tuplet-custom"
  | "flip"
  | "voice-1"
  | "voice-2"
  | "voice-3"
  | "voice-4"
  | "note-input-toggle"
  | "input-duration"
  | "input-repitch-toggle"
  | "input-insert-toggle"
  | "selection-mode"
  | "repeat-selection"
  | "delete-selected-measures"
  | "zoom-in"
  | "zoom-out"
  | "play"
  | "stop"
  | "play-stop"
  | "mixer"
  | "show-palettes"
  | "master-palette"
  | "save"
  | "save-as"
  | "fill-slashes"
  | "toggle-rhythmic-slash"
  | "explode"
  | "implode"
  | "page-settings"
  | "metronome"
  | "rewind"
  | "chord-symbol";

export type MuseScoreCommandSettings = {
  command?: CommandId;
};

type CommandDefinition = {
  label: string;
  shortcut?: MuseScoreShortcut;
  menu?: { menus: string[]; items: string[] };
  menuPath?: { menus: string[]; submenus: string[]; items: string[] };
  button?: string[];
  paletteQuery?: string;
  note?: string;
};

const commandDefinitions: Record<CommandId, CommandDefinition> = {
  "duration-64": { label: "64分音符", shortcut: { key: "1" } },
  "duration-32": { label: "32分音符", shortcut: { key: "2" } },
  "duration-16": { label: "16分音符", shortcut: { key: "3" } },
  "duration-8": { label: "8分音符", shortcut: { key: "4" } },
  "duration-quarter": { label: "4分音符", shortcut: { key: "5" } },
  "duration-half": { label: "2分音符", shortcut: { key: "6" } },
  "duration-whole": { label: "全音符", shortcut: { key: "7" } },
  "duration-double-whole": { label: "倍全音符", shortcut: { key: "8" } },
  "duration-longa": { label: "ロンガ", shortcut: { key: "9" } },
  dot: { label: "付点", shortcut: { key: "." } },
  "double-dot": { label: "複付点", paletteQuery: "複付点" },
  sharp: { label: "シャープ", shortcut: { key: "+" } },
  flat: { label: "フラット", shortcut: { key: "-" } },
  natural: { label: "ナチュラル", shortcut: { key: "=" } },
  tie: { label: "タイ", shortcut: { key: "t" } },
  slur: { label: "スラー", shortcut: { key: "s" } },
  staccato: { label: "スタッカート", shortcut: { key: "s", modifiers: ["shift"] } },
  accent: { label: "アクセント", shortcut: { key: "v", modifiers: ["shift"] } },
  marcato: { label: "マルカート", shortcut: { key: "o", modifiers: ["shift"] } },
  tenuto: { label: "テヌート", shortcut: { key: "n", modifiers: ["shift"] } },
  "tuplet-2": { label: "2連符", shortcut: { key: "2", modifiers: ["command"] } },
  "tuplet-3": { label: "3連符", shortcut: { key: "3", modifiers: ["command"] } },
  "tuplet-4": { label: "4連符", shortcut: { key: "4", modifiers: ["command"] } },
  "tuplet-5": { label: "5連符", shortcut: { key: "5", modifiers: ["command"] } },
  "tuplet-6": { label: "6連符", shortcut: { key: "6", modifiers: ["command"] } },
  "tuplet-7": { label: "7連符", shortcut: { key: "7", modifiers: ["command"] } },
  "tuplet-8": { label: "8連符", shortcut: { key: "8", modifiers: ["command"] } },
  "tuplet-9": { label: "9連符", shortcut: { key: "9", modifiers: ["command"] } },
  "tuplet-custom": {
    label: "任意のn連符",
    menuPath: {
      menus: ["Add", "追加", "Notes", "音符"],
      submenus: ["Tuplets", "Tuplet", "連符"],
      items: ["Other...", "Other…", "その他...", "その他…"],
    },
    note: "ダイアログが開くので、nや比率をMuseScore側で入力します。",
  },
  flip: { label: "符幹の反転", shortcut: { key: "x" } },
  "voice-1": { label: "ボイス 1", shortcut: { key: "1", modifiers: ["command", "option"] } },
  "voice-2": { label: "ボイス 2", shortcut: { key: "2", modifiers: ["command", "option"] } },
  "voice-3": { label: "ボイス 3", shortcut: { key: "3", modifiers: ["command", "option"] } },
  "voice-4": { label: "ボイス 4", shortcut: { key: "4", modifiers: ["command", "option"] } },
  "note-input-toggle": { label: "音名入力モード", shortcut: { key: "n" } },
  "input-duration": { label: "音価入力モード", shortcut: { key: "m" } },
  "input-repitch-toggle": {
    label: "再入力モード",
    shortcut: { key: "i", modifiers: ["command", "shift"] },
  },
  "input-insert-toggle": {
    label: "挿入モード",
    shortcut: { key: "i", modifiers: ["command"] },
  },
  "selection-mode": {
    label: "選択モード",
    shortcut: { key: "escape", keyCode: 53 },
    note: "Escape で入力モードを終了します。",
  },
  "repeat-selection": { label: "選択範囲を反復", shortcut: { key: "r" } },
  "delete-selected-measures": {
    label: "選択小節を削除",
    shortcut: { key: "delete", keyCode: 51, modifiers: ["command"] },
  },
  "zoom-in": { label: "ズームイン", shortcut: { key: "=", modifiers: ["command"] } },
  "zoom-out": { label: "ズームアウト", shortcut: { key: "-", modifiers: ["command"] } },
  play: { label: "再生", button: ["Play", "再生"] },
  stop: { label: "停止", button: ["Stop", "Pause", "停止", "一時停止"] },
  "play-stop": {
    label: "再生 / 停止",
    shortcut: { key: "space", keyCode: 49 },
    note: "MuseScore の再生トグルです。",
  },
  mixer: { label: "ミキサー表示", shortcut: { key: "f10", keyCode: 109 } },
  "show-palettes": { label: "パレット表示", shortcut: { key: "f9", keyCode: 101 } },
  "master-palette": {
    label: "マスターパレット",
    shortcut: { key: "f9", keyCode: 101, modifiers: ["shift"] },
  },
  save: { label: "保存", shortcut: { key: "s", modifiers: ["command"] } },
  "save-as": { label: "名前をつけて保存", shortcut: { key: "s", modifiers: ["command", "shift"] } },
  "fill-slashes": {
    label: "スラッシュで埋める",
    menu: {
      menus: ["Tools", "ツール"],
      items: ["Fill with slashes", "Fill With Slashes", "スラッシュで埋める"],
    },
  },
  "toggle-rhythmic-slash": {
    label: "リズムスラッシュ切替",
    menu: {
      menus: ["Tools", "ツール"],
      items: ["Toggle rhythmic slash notation", "リズムスラッシュ記譜を切り替え", "リズムスラッシュ"],
    },
  },
  explode: {
    label: "分散（Explode）",
    menu: { menus: ["Tools", "ツール"], items: ["Explode", "分散", "分解"] },
  },
  implode: {
    label: "集約（Implode）",
    menu: { menus: ["Tools", "ツール"], items: ["Implode", "集約"] },
  },
  "page-settings": {
    label: "ページ設定",
    menu: {
      menus: ["Format", "フォーマット", "書式"],
      items: ["Page settings", "Page Settings…", "Page Settings...", "ページ設定", "ページ設定…"],
    },
  },
  metronome: { label: "メトロノーム", button: ["Metronome", "メトロノーム"] },
  rewind: { label: "巻き戻し", button: ["Rewind", "巻き戻し", "先頭へ"] },
  "chord-symbol": { label: "コード入力", shortcut: { key: "k", modifiers: ["command"] } },
};

const defaultCommand: CommandId = "duration-quarter";

@action({ UUID: "com.codex.musescore-control.command" })
export class MuseScoreCommandAction extends SingletonAction<MuseScoreCommandSettings> {
  override async onWillAppear(ev: WillAppearEvent<MuseScoreCommandSettings>): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings?.command);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<MuseScoreCommandSettings>,
  ): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings?.command);
  }

  override async onKeyDown(ev: KeyDownEvent<MuseScoreCommandSettings>): Promise<void> {
    const commandId = ev.payload.settings?.command ?? defaultCommand;
    const definition = commandDefinitions[commandId];

    if (!definition) {
      streamDeck.logger.error(`Unknown MuseScore command: ${commandId}`);
      await ev.action.showAlert();
      return;
    }

    try {
      if (definition.shortcut) {
        await sendMuseScoreShortcut(definition.shortcut);
      } else if (definition.menuPath) {
        await sendMuseScoreMenuPathAction(
          definition.menuPath.menus,
          definition.menuPath.submenus,
          definition.menuPath.items,
        );
      } else if (definition.menu) {
        await sendMuseScoreMenuAction(definition.menu.menus, definition.menu.items);
      } else if (definition.button) {
        await sendMuseScoreButtonAction(definition.button);
      } else if (definition.paletteQuery) {
        await sendMuseScorePaletteSearch(definition.paletteQuery);
      } else {
        throw new Error(`Command ${commandId} has no execution method`);
      }
    } catch (error) {
      streamDeck.logger.error(`Could not send MuseScore command ${commandId}`, error);
      await ev.action.showAlert();
    }
  }

  private async updateAppearance(
    actionInstance: {
      setTitle(title: string): Promise<void>;
      setImage(image: string): Promise<void>;
    },
    commandId?: CommandId,
  ): Promise<void> {
    const selectedCommand = commandId ?? defaultCommand;
    await Promise.all([
      actionInstance.setTitle(""),
      actionInstance.setImage(commandIcon(selectedCommand)),
    ]);
  }
}

export function getCommandDefinitions(): Readonly<Record<CommandId, CommandDefinition>> {
  return commandDefinitions;
}
