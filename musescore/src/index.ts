import streamDeck from "@elgato/streamdeck";
import { MuseScoreCommandAction } from "./actions/musescore-command.js";
import {
  MuseScoreArpeggiosPaletteAction,
  MuseScoreAccidentalsPaletteAction,
  MuseScoreArticulationsPaletteAction,
  MuseScoreBarlinesPaletteAction,
  MuseScoreBreathsPaletteAction,
  MuseScoreClefsPaletteAction,
  MuseScoreDynamicsPaletteAction,
  MuseScoreGraceNotesPaletteAction,
  MuseScoreGuitarPaletteAction,
  MuseScoreKeySignaturesPaletteAction,
  MuseScoreLayoutPaletteAction,
  MuseScoreLinesPaletteAction,
  MuseScoreKeyboardPaletteAction,
  MuseScoreOrnamentsPaletteAction,
  MuseScoreRepeatsPaletteAction,
  MuseScoreTempoPaletteAction,
  MuseScoreTextPaletteAction,
  MuseScoreTimeSignaturesPaletteAction,
  MuseScoreTremolosPaletteAction,
} from "./actions/musescore-palette.js";
import { MuseScoreMeasureAction } from "./actions/musescore-measure.js";

streamDeck.actions.registerAction(new MuseScoreCommandAction());
streamDeck.actions.registerAction(new MuseScoreGraceNotesPaletteAction());
streamDeck.actions.registerAction(new MuseScoreOrnamentsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreTremolosPaletteAction());
streamDeck.actions.registerAction(new MuseScoreGuitarPaletteAction());
streamDeck.actions.registerAction(new MuseScoreLinesPaletteAction());
streamDeck.actions.registerAction(new MuseScoreBreathsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreArpeggiosPaletteAction());
streamDeck.actions.registerAction(new MuseScoreClefsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreKeySignaturesPaletteAction());
streamDeck.actions.registerAction(new MuseScoreTimeSignaturesPaletteAction());
streamDeck.actions.registerAction(new MuseScoreTempoPaletteAction());
streamDeck.actions.registerAction(new MuseScoreAccidentalsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreDynamicsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreArticulationsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreTextPaletteAction());
streamDeck.actions.registerAction(new MuseScoreKeyboardPaletteAction());
streamDeck.actions.registerAction(new MuseScoreRepeatsPaletteAction());
streamDeck.actions.registerAction(new MuseScoreBarlinesPaletteAction());
streamDeck.actions.registerAction(new MuseScoreLayoutPaletteAction());
streamDeck.actions.registerAction(new MuseScoreMeasureAction());
streamDeck.connect();
