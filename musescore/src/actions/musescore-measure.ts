import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
} from "@elgato/streamdeck";
import { commandIcon } from "../icons.js";
import { sendMuseScoreMenuAction } from "../macos.js";

export type MuseScoreMeasureSettings = Record<string, never>;

@action({ UUID: "com.codex.musescore-control.measure" })
export class MuseScoreMeasureAction extends SingletonAction<MuseScoreMeasureSettings> {
  override async onWillAppear(ev: WillAppearEvent<MuseScoreMeasureSettings>): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<MuseScoreMeasureSettings>,
  ): Promise<void> {
    await this.updateAppearance(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<MuseScoreMeasureSettings>): Promise<void> {
    try {
      // Let MuseScore handle both the insertion location and the count.
      await sendMuseScoreMenuAction(["Add", "追加"], ["Measures", "Bars", "小節"]);
    } catch (error) {
      streamDeck.logger.error("Could not open MuseScore's measure menu", error);
      await ev.action.showAlert();
    }
  }

  private async updateAppearance(
    actionInstance: {
      setTitle(title: string): Promise<void>;
      setImage(image: string): Promise<void>;
    },
    _settings?: MuseScoreMeasureSettings,
  ): Promise<void> {
    await Promise.all([
      actionInstance.setTitle(""),
      actionInstance.setImage(commandIcon("measure")),
    ]);
  }
}
