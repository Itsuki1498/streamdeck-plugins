import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type Modifier = "command" | "option" | "shift" | "control";

export type MuseScoreShortcut = {
  key: string;
  modifiers?: Modifier[];
  keyCode?: number;
};

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function shortcutCommand(shortcut: MuseScoreShortcut): string {
  const modifiers = shortcut.modifiers?.length
    ? ` using {${shortcut.modifiers.map((modifier) => `${modifier} down`).join(", ")}}`
    : "";

  if (shortcut.keyCode !== undefined) {
    return `key code ${shortcut.keyCode}${modifiers}`;
  }

  return `keystroke ${appleScriptString(shortcut.key)}${modifiers}`;
}

function appleScriptList(values: string[]): string {
  return `{${values.map(appleScriptString).join(", ")}}`;
}

function museScoreProcessScript(body: string): string {
  return [
    'tell application id "org.musescore.MuseScore" to activate',
    "delay 0.12",
    'tell application "System Events"',
    '  tell process "MuseScore 4"',
    body,
    "  end tell",
    "end tell",
  ].join("\n");
}

function pasteTextCommand(value: string): string {
  return [
    "    set previousClipboard to the clipboard",
    `    set the clipboard to ${appleScriptString(value)}`,
    '    keystroke "v" using {command down}',
    "    delay 0.06",
    "    try",
    "      set the clipboard to previousClipboard",
    "    end try",
  ].join("\n");
}

/**
 * Activates MuseScore and sends one verified macOS shortcut to its process.
 * The user must grant Accessibility permission to the app running this plugin
 * (Stream Deck or its helper) in System Settings > Privacy & Security > Accessibility.
 */
export async function sendMuseScoreShortcut(shortcut: MuseScoreShortcut): Promise<void> {
  const command = shortcutCommand(shortcut);
  const script = museScoreProcessScript(`    ${command}`);

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

/**
 * Searches MuseScore's palette and applies the first matching result.
 * The palette search itself is a documented MuseScore command; the final
 * Down/Return pair moves from the search field to the first result.
 */
export async function sendMuseScorePaletteSearch(query: string): Promise<void> {
  const script = museScoreProcessScript([
    "    key code 101 using {command down}",
    "    delay 0.2",
    '    keystroke "a" using {command down}',
    pasteTextCommand(query),
    "    delay 0.25",
    "    key code 125",
    "    key code 36",
  ].join("\n"));

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

/** Clicks a menu item using localized title candidates. */
export async function sendMuseScoreMenuAction(
  menuTitles: string[],
  itemTitles: string[],
): Promise<void> {
  const menus = appleScriptList(menuTitles);
  const items = appleScriptList(itemTitles);
  const script = museScoreProcessScript([
    `    set menuTitles to ${menus}`,
    `    set itemTitles to ${items}`,
    "    set clickedItem to false",
    "    repeat with menuTitle in menuTitles",
    "      if exists menu bar item (menuTitle as text) of menu bar 1 then",
    "        click menu bar item (menuTitle as text) of menu bar 1",
    "        delay 0.15",
    "        repeat with itemTitle in itemTitles",
    "          if exists menu item (itemTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1 then",
    "            click menu item (itemTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1",
    "            set clickedItem to true",
    "            exit repeat",
    "          end if",
    "        end repeat",
    "        if clickedItem then exit repeat",
    "        key code 53",
    "      end if",
    "    end repeat",
    "    if not clickedItem then error \"MuseScore menu item was not found\"",
  ].join("\n"));

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

/** Clicks a two-level MuseScore menu path using localized title candidates. */
export async function sendMuseScoreMenuPathAction(
  menuTitles: string[],
  submenuTitles: string[],
  itemTitles: string[],
): Promise<void> {
  const menus = appleScriptList(menuTitles);
  const submenus = appleScriptList(submenuTitles);
  const items = appleScriptList(itemTitles);
  const script = museScoreProcessScript([
    `    set menuTitles to ${menus}`,
    `    set submenuTitles to ${submenus}`,
    `    set itemTitles to ${items}`,
    "    set clickedItem to false",
    "    repeat with menuTitle in menuTitles",
    "      if exists menu bar item (menuTitle as text) of menu bar 1 then",
    "        click menu bar item (menuTitle as text) of menu bar 1",
    "        delay 0.12",
    "        repeat with submenuTitle in submenuTitles",
    "          if exists menu item (submenuTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1 then",
    "            click menu item (submenuTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1",
    "            delay 0.12",
    "            repeat with itemTitle in itemTitles",
    "              if exists menu item (itemTitle as text) of menu 1 of menu item (submenuTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1 then",
    "                click menu item (itemTitle as text) of menu 1 of menu item (submenuTitle as text) of menu 1 of menu bar item (menuTitle as text) of menu bar 1",
    "                set clickedItem to true",
    "                exit repeat",
    "              end if",
    "            end repeat",
    "          end if",
    "          if clickedItem then exit repeat",
    "        end repeat",
    "        if clickedItem then exit repeat",
    "        key code 53",
    "      end if",
    "    end repeat",
    "    if not clickedItem then error \"MuseScore nested menu item was not found\"",
  ].join("\n"));

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

/** Clicks a toolbar/control button using localized title or description candidates. */
export async function sendMuseScoreButtonAction(buttonTitles: string[]): Promise<void> {
  const titles = appleScriptList(buttonTitles);
  const script = museScoreProcessScript([
    `    set buttonTitles to ${titles}`,
    "    set clickedButton to false",
    "    repeat with windowRef in windows",
    "      try",
    "        set elementsToCheck to entire contents of windowRef",
    "        repeat with elementRef in elementsToCheck",
    "          try",
    "            if class of elementRef is button then",
    "              set elementName to name of elementRef",
    "              set elementDescription to description of elementRef",
    "              repeat with buttonTitle in buttonTitles",
    "                if elementName is (buttonTitle as text) or elementDescription is (buttonTitle as text) then",
    "                  click elementRef",
    "                  set clickedButton to true",
    "                  exit repeat",
    "                end if",
    "              end repeat",
    "            end if",
    "          end try",
    "          if clickedButton then exit repeat",
    "        end repeat",
    "      end try",
    "      if clickedButton then exit repeat",
    "    end repeat",
    "    if not clickedButton then error \"MuseScore button was not found\"",
  ].join("\n"));

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}

export type MeasureInsertLocation = "before-selection" | "after-selection" | "start" | "end";

/** Opens MuseScore's measure-count dialog at the requested score location. */
export async function sendMuseScoreMeasureDialog(location: MeasureInsertLocation): Promise<void> {

  if (location === "before-selection" || location === "end") {
    // The multi-measure shortcuts open the count dialog. Do not type or
    // confirm anything here; the next keyboard input belongs to the user.
    const shortcut = location === "before-selection"
      ? "key code 114 using {command down}"
      : 'keystroke "b" using {option down, shift down}';
    await execFileAsync("/usr/bin/osascript", ["-e", museScoreProcessScript(`    ${shortcut}`)]);
    return;
  }

  const locationTitles = location === "after-selection"
    ? ["Insert measures after selection", "Insert measures after", "選択範囲の後に小節を挿入", "選択後に小節を挿入"]
    : ["Insert measures at start of score", "Insert measures at beginning of score", "スコアの冒頭に小節を挿入", "スコアの初めに小節を挿入"];
  const script = museScoreProcessScript([
    `    set addTitles to ${appleScriptList(["Add", "追加"])}`,
    `    set measureTitles to ${appleScriptList(["Measures", "Bars", "小節", "拍子"])}`,
    `    set locationTitles to ${appleScriptList(locationTitles)}`,
    "    set completed to false",
    "    repeat with addTitle in addTitles",
    "      if exists menu bar item (addTitle as text) of menu bar 1 then",
    "        click menu bar item (addTitle as text) of menu bar 1",
    "        delay 0.12",
    "        repeat with measureTitle in measureTitles",
    "          if exists menu item (measureTitle as text) of menu 1 of menu bar item (addTitle as text) of menu bar 1 then",
    "            click menu item (measureTitle as text) of menu 1 of menu bar item (addTitle as text) of menu bar 1",
    "            delay 0.12",
    "            repeat with locationTitle in locationTitles",
    "              if exists menu item (locationTitle as text) of menu 1 of menu item (measureTitle as text) of menu 1 of menu bar item (addTitle as text) of menu bar 1 then",
    "                click menu item (locationTitle as text) of menu 1 of menu item (measureTitle as text) of menu 1 of menu bar item (addTitle as text) of menu bar 1",
    "                set completed to true",
    "                exit repeat",
    "              end if",
    "            end repeat",
    "          end if",
    "          if completed then exit repeat",
    "        end repeat",
    "      end if",
    "      if completed then exit repeat",
    "    end repeat",
    "    if not completed then error \"MuseScore measure location was not found\"",
  ].join("\n"));

  await execFileAsync("/usr/bin/osascript", ["-e", script]);
}
