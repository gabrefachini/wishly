import { BellRing, HandCoins, ImagePlus, Link as LinkIcon, Mail, Radar, Sparkles, Target, Upload } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { WishlistThemeSection } from "./WishlistThemeSection";
import type { PriceAlertPreference, PriceRadarPriority, WishlistType } from "../types/domain";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-warm-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-terracotta">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-warm-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4 text-base text-warm-900 outline-none transition placeholder:text-warm-300 focus:border-coral focus:ring-4 focus:ring-coral/15";

type CreateWishlistFormProps = {
  values: {
    title: string;
    type: WishlistType;
    occasion: string;
    event_date: string;
    message: string;
    cover_image_url: string;
    visibility: "private" | "public_link";
    theme_preset: "default" | "baby" | "wedding" | "birthday" | "christmas" | "newHome" | "minimal";
    theme_primary_color: string;
    theme_secondary_color: string;
    use_custom_theme: boolean;
    is_price_radar_enabled: boolean;
  };
  errors: Record<string, string | undefined>;
  loading: boolean;
  coverUploading: boolean;
  t: (key: string) => string;
  onChange: (name: string, value: string | boolean) => void;
  onCoverUpload: (file: File | null) => void;
  onSubmit: () => void;
};

export function CreateWishlistForm({
  values,
  errors,
  loading,
  coverUploading,
  t,
  onChange,
  onCoverUpload,
  onSubmit,
}: CreateWishlistFormProps) {
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label={t("create.wishlistName")} error={errors.title}>
        <input
          className={inputClass}
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
        />
      </Field>
      <Field label={t("create.listType")}>
        <select
          className={inputClass}
          value={values.type}
          onChange={(event) => onChange("type", event.target.value)}
        >
          <option value="event">{t("wishlistType.event")}</option>
          <option value="wishlist">{t("wishlistType.wishlist")}</option>
        </select>
        <p className="text-xs leading-6 text-warm-500">{t("create.listTypeHint")}</p>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        {values.type === "event" ? (
          <Field label={t("create.occasion")} error={errors.occasion}>
            <select
              className={inputClass}
              value={values.occasion}
              onChange={(event) => onChange("occasion", event.target.value)}
            >
              <option value="birthday">{t("occasions.birthday")}</option>
              <option value="babyShower">{t("occasions.babyShower")}</option>
              <option value="wedding">{t("occasions.wedding")}</option>
              <option value="christmas">{t("occasions.christmas")}</option>
              <option value="newHome">{t("occasions.newHome")}</option>
            </select>
          </Field>
        ) : (
          <Field label={t("create.occasion")} hint={t("create.wishlistOccasionHint")}>
            <div className="inline-flex min-h-12 items-center rounded-2xl border border-warm-100 bg-warm-50 px-4 text-base font-semibold text-warm-700">
              {t("wishlistType.wishlist")}
            </div>
          </Field>
        )}
        <Field label={t("create.eventDate")}>
          <input
            className={inputClass}
            type="date"
            value={values.event_date}
            onChange={(event) => onChange("event_date", event.target.value)}
          />
        </Field>
      </div>
      <Field label={t("create.message")} hint={t("create.messageHint")}>
        <textarea
          className={`${inputClass} min-h-28 py-3`}
          value={values.message}
          onChange={(event) => onChange("message", event.target.value)}
        />
      </Field>
      <div className="grid gap-2">
        <span className="text-sm font-semibold text-warm-700">{t("actions.chooseCover")}</span>
        <div className="grid gap-3">
          <div className="relative">
            <ImagePlus
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
              aria-hidden="true"
            />
            <input
              className={`${inputClass} w-full pl-11`}
              value={values.cover_image_url}
              onChange={(event) => onChange("cover_image_url", event.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-warm-100 bg-porcelain px-5 py-3 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta"
            >
              <Upload size={17} aria-hidden="true" />
              {coverUploading ? t("create.coverUploading") : t("create.coverUploadAction")}
            </button>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                onCoverUpload(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
            <span className="text-xs leading-6 text-warm-500">{t("create.coverUploadHint")}</span>
          </div>
          {values.cover_image_url ? (
            <img
              src={values.cover_image_url}
              alt=""
              className="h-40 w-full rounded-[24px] object-cover ring-1 ring-warm-100"
            />
          ) : null}
        </div>
        {errors.cover_image_url ? <span className="text-xs text-terracotta">{errors.cover_image_url}</span> : null}
      </div>
      <Field label={t("create.visibility")}>
        <div className="grid gap-2">
          {values.type === "wishlist" ? (
            <div className="grid gap-2">
              <div className="inline-flex min-h-12 items-center rounded-2xl border border-warm-100 bg-warm-50 px-4 text-base font-semibold text-warm-700">
                {t("common.private")}
              </div>
              <p className="text-xs leading-6 text-warm-500">{t("create.visibilityPrivateHint")}</p>
            </div>
          ) : (
            <>
              <select
                className={inputClass}
                value={values.visibility}
                onChange={(event) => onChange("visibility", event.target.value)}
              >
                <option value="public_link">{t("common.publicLink")}</option>
                <option value="private">{t("common.private")}</option>
              </select>
              <p className="text-xs leading-6 text-warm-500">
                {values.visibility === "private"
                  ? t("create.visibilityPrivateHint")
                  : t("create.visibilityPublicHint")}
              </p>
            </>
          )}
        </div>
      </Field>
      {values.type === "wishlist" ? (
        <label className="grid gap-3 rounded-[28px] border border-warm-100 bg-warm-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush text-terracotta">
              <Radar size={18} aria-hidden="true" />
            </span>
            <div className="grid gap-1">
              <span className="text-sm font-semibold text-warm-800">{t("create.radarTitle")}</span>
              <span className="text-xs leading-6 text-warm-500">{t("create.radarHint")}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-warm-700">{t("create.radarToggle")}</span>
            <button
              type="button"
              aria-pressed={values.is_price_radar_enabled}
              onClick={() => onChange("is_price_radar_enabled", !values.is_price_radar_enabled)}
              className={`relative inline-flex h-10 w-[72px] items-center rounded-full border transition ${
                values.is_price_radar_enabled
                  ? "border-coral bg-coral/15"
                  : "border-warm-200 bg-white"
              }`}
            >
              <span
                className={`inline-block h-8 w-8 rounded-full bg-white shadow-sm transition ${
                  values.is_price_radar_enabled ? "translate-x-8 bg-coral" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="text-xs leading-6 text-warm-500">{t("create.radarToggleHint")}</p>
        </label>
      ) : null}
      <WishlistThemeSection
        values={{
          theme_preset: values.theme_preset,
          theme_primary_color: values.theme_primary_color,
          theme_secondary_color: values.theme_secondary_color,
          use_custom_theme: values.use_custom_theme,
        }}
        t={t}
        onChange={onChange}
      />
      <PrimaryButton type="submit" className="w-full" disabled={loading || coverUploading}>
        {t("actions.createWishlist")}
      </PrimaryButton>
    </form>
  );
}

type AddGiftFormProps = {
  values: {
    wishlist_id: string;
    name: string;
    store_url: string;
    estimated_price: string;
    currency: string;
    priority: "must_have" | "nice_to_have" | "surprise_me";
    purchase_type: "individual" | "collective";
    funding_goal_amount: string;
    image_url: string;
    description: string;
    price_tracking_enabled: boolean;
    current_price: string;
    target_price: string;
    price_radar_priority: PriceRadarPriority;
    price_alert_preferences: PriceAlertPreference[];
  };
  wishlistOptions: Array<{ id: string; title: string; type: WishlistType; is_price_radar_enabled: boolean }>;
  errors: Record<string, string | undefined>;
  loading: boolean;
  t: (key: string) => string;
  onChange: (name: string, value: string | boolean | string[]) => void;
  onSubmit: () => void;
  priceTrackingAllowed: boolean;
};

type PriceRadarFieldsProps = {
  enabled: boolean;
  priceTrackingAllowed: boolean;
  values: {
    price_tracking_enabled: boolean;
    current_price: string;
    target_price: string;
    price_radar_priority: PriceRadarPriority;
    price_alert_preferences: PriceAlertPreference[];
  };
  errors: Record<string, string | undefined>;
  t: (key: string) => string;
  onChange: (name: string, value: string | boolean | string[]) => void;
  upgradeHref?: string;
};

export function PriceRadarFields({
  enabled,
  priceTrackingAllowed,
  values,
  errors,
  t,
  onChange,
  upgradeHref = "/premium/radar-de-precos",
}: PriceRadarFieldsProps) {
  const alertOptions: Array<{ value: PriceAlertPreference; label: string }> = [
    { value: "any_drop", label: t("priceRadar.alerts.anyDrop") },
    { value: "drop_5", label: t("priceRadar.alerts.drop5") },
    { value: "drop_10", label: t("priceRadar.alerts.drop10") },
    { value: "below_target", label: t("priceRadar.alerts.belowTarget") },
    { value: "back_to_low", label: t("priceRadar.alerts.backToLow") },
    { value: "weekly_summary", label: t("priceRadar.alerts.weeklySummary") },
    { value: "relevant_only", label: t("priceRadar.alerts.relevantOnly") },
  ];

  function toggleAlert(value: PriceAlertPreference) {
    const next = values.price_alert_preferences.includes(value)
      ? values.price_alert_preferences.filter((item) => item !== value)
      : [...values.price_alert_preferences, value];
    onChange("price_alert_preferences", next);
  }

  if (!enabled) {
    return (
      <label className="grid gap-3 rounded-[28px] border border-dashed border-warm-200 bg-warm-50/60 p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-coral">
            <Target size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-warm-800">{t("priceRadar.sectionTitle")}</p>
            <p className="text-xs leading-6 text-warm-500">{t("priceRadar.sectionBody")}</p>
          </div>
        </div>
        {priceTrackingAllowed ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-coral px-4 text-sm font-semibold text-white"
            onClick={() => onChange("price_tracking_enabled", true)}
          >
            {t("priceRadar.activate")}
          </button>
        ) : (
          <Link
            to={upgradeHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-coral px-4 text-sm font-semibold text-white"
          >
            {t("priceRadar.upgrade")}
          </Link>
        )}
        {!priceTrackingAllowed ? <p className="text-xs leading-6 text-warm-500">{t("priceRadar.freeLimit")}</p> : null}
      </label>
    );
  }

  return (
    <section className="grid gap-4 rounded-[28px] border border-warm-100 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blush text-terracotta">
          <Radar size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-warm-800">{t("priceRadar.sectionTitle")}</p>
          <p className="text-xs leading-6 text-warm-500">{t("priceRadar.sectionBody")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-warm-700">{t("priceRadar.currentPrice")}</span>
          <input
            className={inputClass}
            value={values.current_price}
            onChange={(event) => onChange("current_price", event.target.value)}
            placeholder="1899"
          />
          {errors.current_price ? <span className="text-xs text-terracotta">{errors.current_price}</span> : null}
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-warm-700">{t("priceRadar.targetPrice")}</span>
          <input
            className={inputClass}
            value={values.target_price}
            onChange={(event) => onChange("target_price", event.target.value)}
            placeholder="1749"
          />
          {errors.target_price ? <span className="text-xs text-terracotta">{errors.target_price}</span> : null}
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-warm-700">{t("priceRadar.priority")}</span>
        <select
          className={inputClass}
          value={values.price_radar_priority}
          onChange={(event) => onChange("price_radar_priority", event.target.value)}
        >
          <option value="must_buy">{t("priceRadar.priority.mustBuy")}</option>
          <option value="maybe_buy">{t("priceRadar.priority.maybeBuy")}</option>
          <option value="sale_only">{t("priceRadar.priority.saleOnly")}</option>
          <option value="future_gift">{t("priceRadar.priority.futureGift")}</option>
        </select>
      </label>

      <div className="grid gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-warm-700">
          <BellRing size={16} aria-hidden="true" />
          {t("priceRadar.alerts.title")}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {alertOptions.map((option) => {
            const active = values.price_alert_preferences.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleAlert(option.value)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                  active
                    ? "border-coral bg-blush text-terracotta"
                    : "border-warm-100 bg-porcelain text-warm-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AddGiftForm({
  values,
  wishlistOptions,
  errors,
  loading,
  t,
  onChange,
  onSubmit,
  priceTrackingAllowed,
}: AddGiftFormProps) {
  const selectedWishlist = wishlistOptions.find((wishlist) => wishlist.id === values.wishlist_id);

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label={t("giftForm.selectWishlist")} error={errors.wishlist_id}>
        <select
          className={inputClass}
          value={values.wishlist_id}
          onChange={(event) => onChange("wishlist_id", event.target.value)}
        >
          {wishlistOptions.map((wishlist) => (
            <option key={wishlist.id} value={wishlist.id}>
              {wishlist.title} {wishlist.type === "wishlist" ? `· ${t("wishlistType.wishlist")}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("giftForm.giftName")} error={errors.name}>
        <input
          className={inputClass}
          value={values.name}
          onChange={(event) => onChange("name", event.target.value)}
        />
      </Field>
      <Field label={t("giftForm.storeLink")} error={errors.store_url}>
        <div className="relative">
          <LinkIcon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} w-full pl-11`}
            value={values.store_url}
            onChange={(event) => onChange("store_url", event.target.value)}
            placeholder="https://store.com/product"
          />
        </div>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("giftForm.estimatedPrice")} error={errors.estimated_price}>
          <input
            className={inputClass}
            value={values.estimated_price}
            onChange={(event) => onChange("estimated_price", event.target.value)}
          />
        </Field>
        <Field label={t("common.currency")}>
          <select
            className={inputClass}
            value={values.currency}
            onChange={(event) => onChange("currency", event.target.value)}
          >
            <option value="USD">USD</option>
            <option value="BRL">BRL</option>
          </select>
        </Field>
      </div>
      <Field label={t("giftForm.priority")}>
        <select
          className={inputClass}
          value={values.priority}
          onChange={(event) => onChange("priority", event.target.value)}
        >
          <option value="must_have">{t("priority.mustHave")}</option>
          <option value="nice_to_have">{t("priority.niceToHave")}</option>
          <option value="surprise_me">{t("priority.surpriseMe")}</option>
        </select>
      </Field>
      <Field label={t("giftForm.purchaseType")}>
        <select
          className={inputClass}
          value={values.purchase_type}
          onChange={(event) => onChange("purchase_type", event.target.value)}
        >
          <option value="individual">{t("giftForm.individualGift")}</option>
          <option value="collective">{t("giftFunding.groupGift")}</option>
        </select>
      </Field>
      {values.purchase_type === "collective" ? (
        <Field label={t("giftFunding.goal")} error={errors.funding_goal_amount}>
          <div className="relative">
            <HandCoins
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
              aria-hidden="true"
            />
            <input
              className={`${inputClass} w-full pl-11`}
              value={values.funding_goal_amount}
              onChange={(event) => onChange("funding_goal_amount", event.target.value)}
              placeholder="200"
            />
          </div>
        </Field>
      ) : null}
      {selectedWishlist?.type === "wishlist" ? (
        <PriceRadarFields
          enabled={values.price_tracking_enabled}
          priceTrackingAllowed={priceTrackingAllowed}
          values={{
            price_tracking_enabled: values.price_tracking_enabled,
            current_price: values.current_price,
            target_price: values.target_price,
            price_radar_priority: values.price_radar_priority,
            price_alert_preferences: values.price_alert_preferences,
          }}
          errors={errors}
          t={t}
          onChange={onChange}
        />
      ) : null}
      <Field label={t("actions.addProductImage")} error={errors.image_url}>
        <div className="relative">
          <ImagePlus
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} w-full pl-11`}
            value={values.image_url}
            onChange={(event) => onChange("image_url", event.target.value)}
            placeholder="https://images.unsplash.com/..."
          />
        </div>
      </Field>
      <Field label={t("giftForm.optionalNote")} hint={t("giftForm.noteHint")}>
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder={t("giftForm.notePlaceholder")}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <PrimaryButton type="submit" disabled={loading}>
          <Sparkles size={17} aria-hidden="true" />
          {t("actions.addGift")}
        </PrimaryButton>
        <SecondaryButton type="button">{t("actions.saveForLater")}</SecondaryButton>
      </div>
    </form>
  );
}

type ContributionFormProps = {
  values: {
    contributor_name: string;
    contributor_email: string;
    contributor_message: string;
    amount: string;
  };
  errors: Record<string, string | undefined>;
  loading: boolean;
  t: (key: string) => string;
  amountOptions: string[];
  onPickAmount: (amount: string) => void;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function ContributionForm({
  values,
  errors,
  loading,
  t,
  amountOptions,
  onPickAmount,
  onChange,
  onSubmit,
  onClose,
}: ContributionFormProps) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label={t("giftFunding.chooseAmount")} error={errors.amount}>
        <div className="grid grid-cols-2 gap-2">
          {amountOptions.map((amount) => (
            <SecondaryButton
              key={amount}
              type="button"
              className={values.amount === amount ? "border-coral text-terracotta" : ""}
              onClick={() => onPickAmount(amount)}
            >
              {amount}
            </SecondaryButton>
          ))}
        </div>
      </Field>
      <Field label={t("giftFunding.customAmount")} error={errors.amount}>
        <input
          className={inputClass}
          value={values.amount}
          onChange={(event) => onChange("amount", event.target.value)}
        />
      </Field>
      <Field label={t("giftFunding.contributorName")} error={errors.contributor_name}>
        <input
          className={inputClass}
          value={values.contributor_name}
          onChange={(event) => onChange("contributor_name", event.target.value)}
        />
      </Field>
      <Field label={t("giftFunding.contributorEmail")} error={errors.contributor_email}>
        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} w-full pl-11`}
            value={values.contributor_email}
            onChange={(event) => onChange("contributor_email", event.target.value)}
          />
        </div>
      </Field>
      <Field label={t("giftFunding.message")}>
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          value={values.contributor_message}
          onChange={(event) => onChange("contributor_message", event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryButton type="submit" disabled={loading}>
          {t("giftFunding.continueToPayment")}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClose}>
          {t("actions.close")}
        </SecondaryButton>
      </div>
    </form>
  );
}

type ReservationFormProps = {
  values: {
    reserver_name: string;
    reserver_email: string;
    reserver_message: string;
  };
  errors: Record<string, string | undefined>;
  loading: boolean;
  t: (key: string) => string;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function ReservationForm({
  values,
  errors,
  loading,
  t,
  onChange,
  onSubmit,
  onClose,
}: ReservationFormProps) {
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label={t("reservation.name")} error={errors.reserver_name}>
        <input
          className={inputClass}
          value={values.reserver_name}
          onChange={(event) => onChange("reserver_name", event.target.value)}
        />
      </Field>
      <Field label={t("reservation.email")} error={errors.reserver_email}>
        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-warm-300"
            aria-hidden="true"
          />
          <input
            className={`${inputClass} w-full pl-11`}
            value={values.reserver_email}
            onChange={(event) => onChange("reserver_email", event.target.value)}
          />
        </div>
      </Field>
      <Field label={t("reservation.message")}>
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          value={values.reserver_message}
          onChange={(event) => onChange("reserver_message", event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryButton type="submit" disabled={loading}>
          {t("actions.confirmReservation")}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onClose}>
          {t("actions.close")}
        </SecondaryButton>
      </div>
    </form>
  );
}
