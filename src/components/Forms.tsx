import { HandCoins, ImagePlus, Link as LinkIcon, Mail, Sparkles, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { PrimaryButton, SecondaryButton } from "./Buttons";

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
    occasion: string;
    event_date: string;
    message: string;
    cover_image_url: string;
    visibility: "private" | "public_link";
  };
  errors: Record<string, string | undefined>;
  loading: boolean;
  coverUploading: boolean;
  t: (key: string) => string;
  onChange: (name: string, value: string) => void;
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
      <div className="grid gap-5 sm:grid-cols-2">
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
      <Field label={t("actions.chooseCover")} error={errors.cover_image_url}>
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
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-warm-100 bg-porcelain px-5 py-3 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta">
              <Upload size={17} aria-hidden="true" />
              {coverUploading ? t("create.coverUploading") : t("create.coverUploadAction")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  onCoverUpload(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
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
      </Field>
      <Field label={t("create.visibility")}>
        <div className="grid gap-2">
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
        </div>
      </Field>
      <PrimaryButton type="submit" className="w-full" disabled={loading}>
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
  };
  wishlistOptions: Array<{ id: string; title: string }>;
  errors: Record<string, string | undefined>;
  loading: boolean;
  t: (key: string) => string;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
};

export function AddGiftForm({
  values,
  wishlistOptions,
  errors,
  loading,
  t,
  onChange,
  onSubmit,
}: AddGiftFormProps) {
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
              {wishlist.title}
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
