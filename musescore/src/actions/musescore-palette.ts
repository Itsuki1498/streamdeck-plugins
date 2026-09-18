import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";
import { sendMuseScorePaletteSearch } from "../macos.js";
// The browser property inspector and plugin intentionally share this plain-JS catalog.
// @ts-expect-error The source is bundled by Rollup and has no separate declaration file.
import { findPaletteItem, findPaletteItemByQuery, paletteCategoryMap, paletteIcon } from "../../plugin/com.codex.musescore-control.sdPlugin/ui/palette-shared.js";

export type MuseScorePaletteCategorySettings = {
  item?: string;
  query?: string;
};

/** One action represents one official MuseScore palette. */
abstract class MuseScorePaletteCategoryAction extends SingletonAction<MuseScorePaletteCategorySettings> {
  protected abstract readonly categoryId: string;

  override async onWillAppear(ev: WillAppearEvent<MuseScorePaletteCategorySettings>): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<MuseScorePaletteCategorySettings>): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<MuseScorePaletteCategorySettings>): Promise<void> {
    const settings = ev.payload.settings;
    const selectedItem = findPaletteItem(this.categoryId, settings?.item ?? "")
      ?? findPaletteItemByQuery(this.categoryId, settings?.query ?? "")
      ?? paletteCategoryMap[this.categoryId]?.items[0];
    const query = settings?.query?.trim() || selectedItem?.query?.trim();
    const categoryLabel = paletteCategoryMap[this.categoryId]?.label ?? this.categoryId;

    if (!query) {
      streamDeck.logger.warn(`MuseScore ${categoryLabel} palette action needs an item`);
      await ev.action.showAlert();
      return;
    }

    try {
      await sendMuseScorePaletteSearch(query);
    } catch (error) {
      streamDeck.logger.error(`Could not apply MuseScore ${categoryLabel} palette item: ${query}`, error);
      await ev.action.showAlert();
    }
  }

  private async updateAppearance(
    actionInstance: { setTitle(title: string): Promise<void>; setImage(image: string): Promise<void> },
    settings?: MuseScorePaletteCategorySettings,
  ): Promise<void> {
    const selectedItem = findPaletteItem(this.categoryId, settings?.item ?? "")
      ?? findPaletteItemByQuery(this.categoryId, settings?.query ?? "")
      ?? paletteCategoryMap[this.categoryId]?.items[0];
    await Promise.all([
      actionInstance.setTitle(""),
      actionInstance.setImage(paletteIcon(this.categoryId, selectedItem?.id ?? "")),
    ]);
  }
}

@action({ UUID: "com.codex.musescore-control.palette.grace-notes" })
export class MuseScoreGraceNotesPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "grace-notes"; }

@action({ UUID: "com.codex.musescore-control.palette.ornaments" })
export class MuseScoreOrnamentsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "ornaments"; }

@action({ UUID: "com.codex.musescore-control.palette.tremolos" })
export class MuseScoreTremolosPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "tremolos"; }

@action({ UUID: "com.codex.musescore-control.palette.guitar" })
export class MuseScoreGuitarPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "guitar"; }

@action({ UUID: "com.codex.musescore-control.palette.lines" })
export class MuseScoreLinesPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "lines"; }

@action({ UUID: "com.codex.musescore-control.palette.breaths" })
export class MuseScoreBreathsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "breaths"; }

@action({ UUID: "com.codex.musescore-control.palette.arpeggios" })
export class MuseScoreArpeggiosPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "arpeggios"; }

@action({ UUID: "com.codex.musescore-control.palette.clefs" })
export class MuseScoreClefsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "clefs"; }

@action({ UUID: "com.codex.musescore-control.palette.key-signatures" })
export class MuseScoreKeySignaturesPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "key-signatures"; }

@action({ UUID: "com.codex.musescore-control.palette.time-signatures" })
export class MuseScoreTimeSignaturesPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "time-signatures"; }

@action({ UUID: "com.codex.musescore-control.palette.tempo" })
export class MuseScoreTempoPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "tempo"; }

@action({ UUID: "com.codex.musescore-control.palette.accidentals" })
export class MuseScoreAccidentalsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "accidentals"; }

@action({ UUID: "com.codex.musescore-control.palette.dynamics" })
export class MuseScoreDynamicsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "dynamics"; }

@action({ UUID: "com.codex.musescore-control.palette.articulations" })
export class MuseScoreArticulationsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "articulations"; }

@action({ UUID: "com.codex.musescore-control.palette.text" })
export class MuseScoreTextPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "text"; }

@action({ UUID: "com.codex.musescore-control.palette.keyboard" })
export class MuseScoreKeyboardPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "keyboard"; }

@action({ UUID: "com.codex.musescore-control.palette.repeats" })
export class MuseScoreRepeatsPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "repeats"; }

@action({ UUID: "com.codex.musescore-control.palette.barlines" })
export class MuseScoreBarlinesPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "barlines"; }

@action({ UUID: "com.codex.musescore-control.palette.layout" })
export class MuseScoreLayoutPaletteAction extends MuseScorePaletteCategoryAction { protected readonly categoryId = "layout"; }
