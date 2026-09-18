export type CustomImageSettings = {
  customImages: Record<string, string>;
};

const dataImagePattern = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i;

export function normalizeCustomImageSettings(input: Record<string, unknown> | undefined): CustomImageSettings {
  const value = input ?? {};
  const customImages: Record<string, string> = {};
  if (value.customImages && typeof value.customImages === "object") {
    for (const [state, image] of Object.entries(value.customImages as Record<string, unknown>)) {
      if (/^\d+$/.test(state) && typeof image === "string" && dataImagePattern.test(image)) customImages[state] = image;
    }
  }
  // Migrate the first version of the property inspector settings.
  if (!customImages["0"] && typeof value.customImage === "string" && dataImagePattern.test(value.customImage)) customImages["0"] = value.customImage;
  if (!customImages["1"] && typeof value.customAlertImage === "string" && dataImagePattern.test(value.customAlertImage)) customImages["1"] = value.customAlertImage;
  return {
    customImages,
  };
}

export function imageForState(settings: CustomImageSettings, state: number): string | undefined {
  return settings.customImages[String(state)];
}

export function customImageSignature(settings: CustomImageSettings, state: number): string {
  const image = imageForState(settings, state);
  return image ? `custom:${state}:${image}` : `manifest:${state}`;
}
