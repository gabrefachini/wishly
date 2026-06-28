import { RotateCcw, Sparkles } from "lucide-react";
import { SecondaryButton } from "./Buttons";
import {
  getWishlistTheme,
  getWishlistThemeContrastWarning,
  getWishlistThemeCssVars,
  getWishlistThemePresetOptions,
} from "../lib/wishlistAppearance";

type WishlistThemeValues = {
  theme_preset: "default" | "baby" | "wedding" | "birthday" | "christmas" | "newHome" | "minimal";
  theme_primary_color: string;
  theme_secondary_color: string;
  use_custom_theme: boolean;
};

type Props = {
  values: WishlistThemeValues;
  t: (key: string) => string;
  onChange: (name: keyof WishlistThemeValues, value: string | boolean) => void;
};

export function WishlistThemeSection({ values, t, onChange }: Props) {
  const presets = getWishlistThemePresetOptions();
  const theme = getWishlistTheme(values);
  const hasContrastWarning = getWishlistThemeContrastWarning(values);

  return (
    <section className="grid gap-4 rounded-[28px] bg-warm-50/55 p-4 ring-1 ring-warm-100">
      <div>
        <h3 className="text-lg font-bold text-warm-900">{t("theme.title")}</h3>
        <p className="mt-1 text-sm leading-6 text-warm-500">{t("theme.body")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => {
          const active = values.theme_preset === preset.value && !values.use_custom_theme;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange("theme_preset", preset.value);
                onChange("use_custom_theme", false);
                onChange("theme_primary_color", preset.primary);
                onChange("theme_secondary_color", preset.secondary);
              }}
              className={`grid gap-3 rounded-[24px] border px-4 py-4 text-left transition ${
                active
                  ? "border-coral bg-porcelain shadow-card"
                  : "border-warm-100 bg-porcelain/80 hover:border-coral/35"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-warm-900">{t(`theme.presets.${preset.value}`)}</span>
                {active ? <Sparkles size={16} className="text-coral" aria-hidden="true" /> : null}
              </div>
              <div className="flex gap-2">
                <span className="h-7 w-7 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.primary }} />
                <span className="h-7 w-7 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.secondary }} />
              </div>
            </button>
          );
        })}
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-warm-700">{t("theme.customMode")}</span>
        <div className="inline-flex w-fit rounded-full bg-porcelain p-1 ring-1 ring-warm-100">
          <button
            type="button"
            onClick={() => onChange("use_custom_theme", false)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              !values.use_custom_theme ? "bg-warm-900 text-white" : "text-warm-600"
            }`}
          >
            {t("theme.usePreset")}
          </button>
          <button
            type="button"
            onClick={() => onChange("use_custom_theme", true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              values.use_custom_theme ? "bg-warm-900 text-white" : "text-warm-600"
            }`}
          >
            {t("theme.chooseMyColors")}
          </button>
        </div>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-warm-700">{t("theme.primary")}</span>
          <div className="flex items-center gap-3 rounded-[22px] bg-porcelain px-4 py-3 ring-1 ring-warm-100">
            <input
              type="color"
              value={values.theme_primary_color}
              disabled={!values.use_custom_theme}
              onChange={(event) => onChange("theme_primary_color", event.target.value.toUpperCase())}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-warm-700">{values.theme_primary_color}</span>
          </div>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-warm-700">{t("theme.secondary")}</span>
          <div className="flex items-center gap-3 rounded-[22px] bg-porcelain px-4 py-3 ring-1 ring-warm-100">
            <input
              type="color"
              value={values.theme_secondary_color}
              disabled={!values.use_custom_theme}
              onChange={(event) => onChange("theme_secondary_color", event.target.value.toUpperCase())}
              className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-warm-700">{values.theme_secondary_color}</span>
          </div>
        </label>
      </div>

      {hasContrastWarning ? (
        <p className="text-xs leading-6 text-terracotta">{t("theme.contrastWarning")}</p>
      ) : (
        <p className="text-xs leading-6 text-warm-500">{t("theme.contrastSafe")}</p>
      )}

      <div className="flex justify-start">
        <SecondaryButton
          type="button"
          onClick={() => {
            onChange("theme_preset", "default");
            onChange("use_custom_theme", false);
            onChange("theme_primary_color", "#DE7762");
            onChange("theme_secondary_color", "#DCD2FF");
          }}
        >
          <RotateCcw size={16} aria-hidden="true" />
          {t("theme.reset")}
        </SecondaryButton>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-semibold text-warm-700">{t("theme.preview")}</p>
        <div
          className="overflow-hidden rounded-[28px] bg-cream ring-1 ring-warm-100"
          style={getWishlistThemeCssVars(values)}
        >
          <div
            className="p-4"
            style={{ backgroundImage: "var(--wishlist-header-gradient)" }}
          >
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--wishlist-secondary-soft)",
                color: "var(--wishlist-badge)",
              }}
            >
              {t("visitor.noLogin")}
            </span>
            <h4 className="mt-4 text-xl font-bold text-warm-900">{t("theme.previewTitle")}</h4>
            <p className="mt-2 text-sm text-warm-600">{t("theme.previewBody")}</p>
          </div>
          <div className="grid gap-3 p-4">
            <div className="rounded-[24px] bg-white p-4 shadow-card ring-1 ring-warm-100/80">
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: "var(--wishlist-secondary-soft)", color: "var(--wishlist-badge)" }}
                >
                  {t("status.reserved")}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: "var(--wishlist-primary-soft)", color: "var(--wishlist-primary)" }}
                >
                  {t("priority.mustHave")}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-warm-100">
                <div className="h-full rounded-full" style={{ width: "56%", backgroundColor: "var(--wishlist-progress)" }} />
              </div>
              <button
                type="button"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--wishlist-button)", boxShadow: `0 10px 24px ${theme.primarySoft}` }}
              >
                {t("actions.buyThis")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
