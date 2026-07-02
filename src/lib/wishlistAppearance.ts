import type { CSSProperties } from "react";
import type { WishlistRecord } from "../types/domain";

export const WISHLIST_THEME_PRESETS = {
  default: {
    name: "Wishly original",
    primary: "#DE7762",
    secondary: "#DCD2FF",
  },
  baby: {
    name: "Chá de bebê",
    primary: "#A7C7E7",
    secondary: "#F6DAD2",
  },
  wedding: {
    name: "Casamento",
    primary: "#C9A66B",
    secondary: "#EFE4DA",
  },
  birthday: {
    name: "Aniversário",
    primary: "#DE7762",
    secondary: "#DCD2FF",
  },
  christmas: {
    name: "Natal",
    primary: "#9F4F45",
    secondary: "#D9E5D6",
  },
  newHome: {
    name: "Casa nova",
    primary: "#B98263",
    secondary: "#DDECF7",
  },
  minimal: {
    name: "Minimalista",
    primary: "#241815",
    secondary: "#EFE4DA",
  },
} as const;

export type WishlistThemePreset = keyof typeof WISHLIST_THEME_PRESETS;

type ThemeInput = Pick<
  WishlistRecord,
  "theme_preset" | "theme_primary_color" | "theme_secondary_color" | "use_custom_theme"
>;

function normalizeHex(value: string | null | undefined, fallback: string) {
  const hex = (value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return hex.toUpperCase();
  }

  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixColors(hexA: string, hexB: string, weight: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  return rgbToHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(hexA: string, hexB: string) {
  const light = Math.max(relativeLuminance(hexA), relativeLuminance(hexB));
  const dark = Math.min(relativeLuminance(hexA), relativeLuminance(hexB));
  return (light + 0.05) / (dark + 0.05);
}

function ensureReadableAccent(accent: string, background = "#FBF7F1", minContrast = 3.2) {
  let current = accent;
  let attempts = 0;

  while (contrastRatio(current, background) < minContrast && attempts < 8) {
    current = mixColors(current, "#241815", 0.18);
    attempts += 1;
  }

  return current;
}

export function getWishlistThemePresetOptions() {
  return Object.entries(WISHLIST_THEME_PRESETS).map(([value, preset]) => ({
    value: value as WishlistThemePreset,
    ...preset,
  }));
}

export function getWishlistThemeDisplayName(
  theme: Partial<ThemeInput> | null | undefined,
  fallbackLabel: string,
) {
  const source = resolveWishlistThemeSource(theme);
  if (source.useCustomTheme) {
    return fallbackLabel;
  }

  return WISHLIST_THEME_PRESETS[source.presetKey].name;
}

export function getWishlistThemeSwatches(theme: Partial<ThemeInput> | null | undefined) {
  const source = resolveWishlistThemeSource(theme);
  return {
    primary: source.useCustomTheme
      ? normalizeHex(theme?.theme_primary_color, WISHLIST_THEME_PRESETS[source.presetKey].primary)
      : WISHLIST_THEME_PRESETS[source.presetKey].primary,
    secondary: source.useCustomTheme
      ? normalizeHex(theme?.theme_secondary_color, WISHLIST_THEME_PRESETS[source.presetKey].secondary)
      : WISHLIST_THEME_PRESETS[source.presetKey].secondary,
  };
}

export function resolveWishlistThemeSource(theme: Partial<ThemeInput> | null | undefined) {
  const presetKey =
    theme?.theme_preset && theme.theme_preset in WISHLIST_THEME_PRESETS
      ? theme.theme_preset
      : "default";
  const preset = WISHLIST_THEME_PRESETS[presetKey];

  const primary = theme?.use_custom_theme
    ? normalizeHex(theme.theme_primary_color, preset.primary)
    : preset.primary;
  const secondary = theme?.use_custom_theme
    ? normalizeHex(theme.theme_secondary_color, preset.secondary)
    : preset.secondary;

  return {
    presetKey: presetKey as WishlistThemePreset,
    primary,
    secondary,
    useCustomTheme: Boolean(theme?.use_custom_theme),
  };
}

export function getWishlistTheme(theme: Partial<ThemeInput> | null | undefined) {
  const source = resolveWishlistThemeSource(theme);
  const primary = ensureReadableAccent(source.primary);
  const secondary = source.secondary;

  return {
    ...source,
    primary,
    primarySoft: mixColors(primary, "#FBF7F1", 0.84),
    secondary,
    secondarySoft: mixColors(secondary, "#FBF7F1", 0.62),
    headerSurface: mixColors(secondary, "#FFFDF9", 0.58),
    buttonColor: primary,
    badgeReservedColor: ensureReadableAccent(mixColors(secondary, "#7C5CC4", 0.28), "#FBF7F1", 2.4),
    progressColor: primary,
    focusRingColor: mixColors(primary, "#FFFFFF", 0.55),
    surfaceTint: mixColors(secondary, "#FFFFFF", 0.78),
  };
}

export function getWishlistThemeCssVars(theme: Partial<ThemeInput> | null | undefined): CSSProperties {
  const resolved = getWishlistTheme(theme);

  return {
    ["--wishlist-primary" as string]: resolved.primary,
    ["--wishlist-primary-soft" as string]: resolved.primarySoft,
    ["--wishlist-secondary" as string]: resolved.secondary,
    ["--wishlist-secondary-soft" as string]: resolved.secondarySoft,
    ["--wishlist-header-surface" as string]: resolved.headerSurface,
    ["--wishlist-button" as string]: resolved.buttonColor,
    ["--wishlist-progress" as string]: resolved.progressColor,
    ["--wishlist-badge" as string]: resolved.badgeReservedColor,
    ["--wishlist-focus-ring" as string]: resolved.focusRingColor,
    ["--wishlist-surface-tint" as string]: resolved.surfaceTint,
  };
}

export function getWishlistThemeContrastWarning(theme: Partial<ThemeInput> | null | undefined) {
  const source = resolveWishlistThemeSource(theme);
  const primaryContrast = contrastRatio(source.primary, "#FBF7F1");
  const secondaryContrast = contrastRatio(source.secondary, "#FBF7F1");

  return primaryContrast < 3 || secondaryContrast < 1.7;
}
