import { ChevronDown, ChevronUp, PencilLine, RotateCcw, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SecondaryButton } from "./Buttons";
import {
  getWishlistThemeContrastWarning,
  getWishlistThemeCssVars,
  getWishlistThemeDisplayName,
  getWishlistThemePresetOptions,
  getWishlistThemeSwatches,
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
  layout?: "stacked" | "split";
};

export function WishlistThemeSection({ values, t, onChange, layout = "stacked" }: Props) {
  const [open, setOpen] = useState(false);
  const presets = getWishlistThemePresetOptions();
  const contrastWarning = getWishlistThemeContrastWarning(values);
  const themeName = getWishlistThemeDisplayName(values, t("theme.summaryCustom"));
  const swatches = getWishlistThemeSwatches(values);

  function setPreset(value: WishlistThemeValues["theme_preset"]) {
    const preset = presets.find((item) => item.value === value);
    if (!preset) return;

    onChange("theme_preset", value);
    onChange("use_custom_theme", false);
    onChange("theme_primary_color", preset.primary);
    onChange("theme_secondary_color", preset.secondary);
  }

  function restoreDefault() {
    setPreset("default");
  }

  if (layout === "split") {
    return (
      <section className="grid gap-3 rounded-modal border border-border bg-surface/90 p-4">
        <AppearanceCustomizerPanel
          values={values}
          t={t}
          presets={presets}
          contrastWarning={contrastWarning}
          onChange={onChange}
          onSetPreset={setPreset}
          onRestoreDefault={restoreDefault}
          showCloseButton={false}
          layout="split"
        />
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-modal border border-border bg-surface/90 p-4">
      <AppearanceSummaryCard
        t={t}
        themeName={themeName}
        swatches={swatches}
        open={open}
        onToggle={() => setOpen((current) => !current)}
      />

      <div className="hidden md:block">
        {open ? (
          <AppearanceCustomizerPanel
            values={values}
            t={t}
            presets={presets}
            contrastWarning={contrastWarning}
            onChange={onChange}
            onSetPreset={setPreset}
            onRestoreDefault={restoreDefault}
            onClose={() => setOpen(false)}
            showCloseButton
            layout="stacked"
          />
        ) : null}
      </div>

      {open ? (
        <AppearanceBottomSheet
          values={values}
          t={t}
          presets={presets}
          contrastWarning={contrastWarning}
          onChange={onChange}
          onSetPreset={setPreset}
          onRestoreDefault={restoreDefault}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}

function AppearanceSummaryCard({
  t,
  themeName,
  swatches,
  open,
  onToggle,
}: {
  t: (key: string) => string;
  themeName: string;
  swatches: { primary: string; secondary: string };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-card bg-white px-4 py-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-warm-900">{t("theme.appearanceLabel")}</p>
          <p className="mt-1 text-sm text-warm-500">{themeName}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-warm-700 transition hover:border-primary/35 hover:text-primary-strong"
        >
          <PencilLine size={16} aria-hidden="true" />
          {t("theme.personalize")}
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ColorSwatch color={swatches.primary} />
        <ColorSwatch color={swatches.secondary} />
        <span className="text-xs text-warm-500">{t("theme.appearanceOptional")}</span>
      </div>
    </div>
  );
}

function AppearanceCustomizerPanel({
  values,
  presets,
  contrastWarning,
  t,
  onChange,
  onSetPreset,
  onRestoreDefault,
  onClose,
  showCloseButton,
  layout,
}: {
  values: WishlistThemeValues;
  presets: Array<{ value: WishlistThemeValues["theme_preset"]; name: string; primary: string; secondary: string }>;
  contrastWarning: boolean;
  t: (key: string) => string;
  onChange: (name: keyof WishlistThemeValues, value: string | boolean) => void;
  onSetPreset: (value: WishlistThemeValues["theme_preset"]) => void;
  onRestoreDefault: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  layout: "stacked" | "split";
}) {
  if (layout === "split") {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(300px,0.84fr)] lg:items-start">
        <div className="grid gap-4 rounded-modal bg-warm-50/60 p-4 ring-1 ring-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-warm-900">{t("theme.title")}</h3>
              <p className="mt-1 text-sm leading-6 text-warm-500">{t("theme.body")}</p>
            </div>
            {showCloseButton && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-warm-600 transition hover:border-primary/35 hover:text-primary-strong"
                aria-label={t("theme.close")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((preset) => {
              const active = values.theme_preset === preset.value && !values.use_custom_theme;
              return (
                <ThemePresetCard
                  key={preset.value}
                  name={preset.name}
                  primary={preset.primary}
                  secondary={preset.secondary}
                  active={active}
                  onClick={() => onSetPreset(preset.value)}
                />
              );
            })}
          </div>

          <div className="grid gap-3">
            <span className="text-sm font-semibold text-warm-700">{t("theme.customMode")}</span>
            <div className="inline-flex w-fit rounded-full bg-white p-1 ring-1 ring-border">
              <ModeToggle active={!values.use_custom_theme} onClick={() => onChange("use_custom_theme", false)}>
                {t("theme.usePreset")}
              </ModeToggle>
              <ModeToggle active={values.use_custom_theme} onClick={() => onChange("use_custom_theme", true)}>
                {t("theme.chooseMyColors")}
              </ModeToggle>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CustomColorPicker
              label={t("theme.primary")}
              value={values.theme_primary_color}
              disabled={!values.use_custom_theme}
              onChange={(value) => onChange("theme_primary_color", value)}
            />
            <CustomColorPicker
              label={t("theme.secondary")}
              value={values.theme_secondary_color}
              disabled={!values.use_custom_theme}
              onChange={(value) => onChange("theme_secondary_color", value)}
            />
          </div>

          {contrastWarning ? (
            <p className="text-xs leading-6 text-primary-strong">{t("theme.contrastWarning")}</p>
          ) : (
            <p className="text-xs leading-6 text-warm-500">{t("theme.contrastSafe")}</p>
          )}

          <div className="sticky bottom-0 z-10 mt-1 -mx-4 flex flex-wrap items-center gap-2 bg-gradient-to-t from-warm-50 via-warm-50/95 to-transparent px-4 pb-1 pt-3">
            <SecondaryButton type="button" onClick={onRestoreDefault}>
              <RotateCcw size={16} aria-hidden="true" />
              {t("theme.reset")}
            </SecondaryButton>
            {showCloseButton && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-strong"
              >
                {t("theme.apply")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <WishlistThemePreview values={values} t={t} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 rounded-modal bg-warm-50/60 p-4 ring-1 ring-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-warm-900">{t("theme.title")}</h3>
          <p className="mt-1 text-sm leading-6 text-warm-500">{t("theme.body")}</p>
        </div>
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-warm-600 transition hover:border-primary/35 hover:text-primary-strong"
            aria-label={t("theme.close")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((preset) => {
          const active = values.theme_preset === preset.value && !values.use_custom_theme;
          return (
            <ThemePresetCard
              key={preset.value}
              name={preset.name}
              primary={preset.primary}
              secondary={preset.secondary}
              active={active}
              onClick={() => onSetPreset(preset.value)}
            />
          );
        })}
      </div>

      <div className="grid gap-3">
        <span className="text-sm font-semibold text-warm-700">{t("theme.customMode")}</span>
        <div className="inline-flex w-fit rounded-full bg-white p-1 ring-1 ring-border">
          <ModeToggle active={!values.use_custom_theme} onClick={() => onChange("use_custom_theme", false)}>
            {t("theme.usePreset")}
          </ModeToggle>
          <ModeToggle active={values.use_custom_theme} onClick={() => onChange("use_custom_theme", true)}>
            {t("theme.chooseMyColors")}
          </ModeToggle>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CustomColorPicker
          label={t("theme.primary")}
          value={values.theme_primary_color}
          disabled={!values.use_custom_theme}
          onChange={(value) => onChange("theme_primary_color", value)}
        />
        <CustomColorPicker
          label={t("theme.secondary")}
          value={values.theme_secondary_color}
          disabled={!values.use_custom_theme}
          onChange={(value) => onChange("theme_secondary_color", value)}
        />
      </div>

      {contrastWarning ? (
        <p className="text-xs leading-6 text-primary-strong">{t("theme.contrastWarning")}</p>
      ) : (
        <p className="text-xs leading-6 text-warm-500">{t("theme.contrastSafe")}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" onClick={onRestoreDefault}>
          <RotateCcw size={16} aria-hidden="true" />
          {t("theme.reset")}
        </SecondaryButton>
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-strong"
          >
            {t("theme.apply")}
          </button>
        ) : null}
      </div>

      <WishlistThemePreview values={values} t={t} compact />
    </div>
  );
}

function AppearanceBottomSheet({
  values,
  presets,
  contrastWarning,
  t,
  onChange,
  onSetPreset,
  onRestoreDefault,
  onClose,
}: {
  values: WishlistThemeValues;
  presets: Array<{ value: WishlistThemeValues["theme_preset"]; name: string; primary: string; secondary: string }>;
  contrastWarning: boolean;
  t: (key: string) => string;
  onChange: (name: keyof WishlistThemeValues, value: string | boolean) => void;
  onSetPreset: (value: WishlistThemeValues["theme_preset"]) => void;
  onRestoreDefault: () => void;
  onClose: () => void;
}) {
  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={t("theme.close")}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/35"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-modal bg-surface shadow-[0_-18px_50px_rgba(36,24,21,0.18)] ring-1 ring-border">
        <div className="max-h-[86vh] overflow-y-auto px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-warm-200" />
          <AppearanceCustomizerPanel
            values={values}
            presets={presets}
            contrastWarning={contrastWarning}
            t={t}
            onChange={onChange}
            onSetPreset={onSetPreset}
            onRestoreDefault={onRestoreDefault}
            onClose={onClose}
            showCloseButton
            layout="stacked"
          />
        </div>
      </div>
    </div>
  );
}

function ThemePresetCard({
  name,
  primary,
  secondary,
  active,
  onClick,
}: {
  name: string;
  primary: string;
  secondary: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid gap-3 rounded-card border px-4 py-4 text-left transition ${
        active ? "border-primary bg-white shadow-card" : "border-border bg-white/85 hover:border-primary/35"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-warm-900">{name}</span>
        {active ? <Sparkles size={16} className="text-primary" aria-hidden="true" /> : null}
      </div>
      <div className="flex gap-2">
        <ColorSwatch color={primary} />
        <ColorSwatch color={secondary} />
      </div>
    </button>
  );
}

function ModeToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-warm-900 text-white" : "text-warm-600"
      }`}
    >
      {children}
    </button>
  );
}

function CustomColorPicker({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-warm-700">{label}</span>
      <div className="flex items-center gap-3 rounded-card bg-white px-4 py-3 ring-1 ring-border">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-warm-700">{value}</span>
      </div>
    </label>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return <span className="h-7 w-7 rounded-full ring-1 ring-black/5" style={{ backgroundColor: color }} />;
}

function WishlistThemePreview({
  values,
  t,
  compact = false,
}: {
  values: WishlistThemeValues;
  t: (key: string) => string;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-warm-700">{t("theme.preview")}</p>
        <span className="text-xs text-warm-500">{t("theme.previewCompact")}</span>
      </div>
      <div
        className={`overflow-hidden rounded-card bg-page ring-1 ring-border ${compact ? "lg:max-w-[380px]" : ""}`}
        style={getWishlistThemeCssVars(values)}
      >
        <div className="grid gap-3 p-4" style={{ backgroundColor: "var(--wishlist-header-surface)" }}>
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--wishlist-secondary-soft)",
                color: "var(--wishlist-badge)",
              }}
            >
              {t("common.publicLink")}
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface text-warm-700">
              <Sparkles size={14} aria-hidden="true" />
            </span>
          </div>
          <div>
            <h4 className="text-base font-bold text-warm-900">{t("theme.previewTitle")}</h4>
            <p className="mt-1 text-xs leading-5 text-warm-600">{t("theme.previewBody")}</p>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <div className="rounded-card bg-white p-3 shadow-card ring-1 ring-border/80">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: "var(--wishlist-primary-soft)", color: "var(--wishlist-primary)" }}
              >
                {t("priority.mustHave")}
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: "var(--wishlist-secondary-soft)", color: "var(--wishlist-badge)" }}
              >
                {t("status.reserved")}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-warm-100">
              <div className="h-full rounded-full" style={{ width: "58%", backgroundColor: "var(--wishlist-progress)" }} />
            </div>
            <button
              type="button"
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--wishlist-button)" }}
            >
              {t("actions.buyThis")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
