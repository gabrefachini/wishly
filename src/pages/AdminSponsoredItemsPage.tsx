import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { LoadingState } from "../components/LoadingState";
import { sponsoredItemSchema } from "../lib/validation";
import { listAffiliateMerchants, listSponsoredItems, saveSponsoredItem, updateSponsoredItemStatus } from "../services/admin";
import type { AffiliateMerchantRecord, SponsoredItemRecord } from "../types/domain";
import { useTranslation } from "../i18n/useTranslation";

type SponsoredItemFormValues = {
  title: string;
  description: string;
  image_url: string;
  destination_url: string;
  merchant_id: string;
  category: string;
  occasion: string;
  price: string;
  currency: string;
  locale: SponsoredItemRecord["locale"];
  status: SponsoredItemRecord["status"];
  priority: string;
  starts_at: string;
  ends_at: string;
};

const initialValues: SponsoredItemFormValues = {
  title: "",
  description: "",
  image_url: "",
  destination_url: "",
  merchant_id: "",
  category: "",
  occasion: "",
  price: "",
  currency: "USD",
  locale: "all" as const,
  status: "draft" as const,
  priority: "0",
  starts_at: "",
  ends_at: "",
};

export function AdminSponsoredItemsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<SponsoredItemRecord[]>([]);
  const [merchants, setMerchants] = useState<AffiliateMerchantRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<SponsoredItemRecord | null>(null);
  const [values, setValues] = useState<SponsoredItemFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([listSponsoredItems(), listAffiliateMerchants()])
      .then(([nextItems, nextMerchants]) => {
        if (!active) return;
        setItems(nextItems);
        setMerchants(nextMerchants);
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  function editItem(item: SponsoredItemRecord | null) {
    setSelectedItem(item);
    setValues(
      item
        ? {
            title: item.title,
            description: item.description || "",
            image_url: item.image_url || "",
            destination_url: item.destination_url,
            merchant_id: item.merchant_id || "",
            category: item.category || "",
            occasion: item.occasion || "",
            price: item.price?.toString() || "",
            currency: item.currency,
            locale: item.locale,
            status: item.status,
            priority: item.priority.toString(),
            starts_at: item.starts_at ? item.starts_at.slice(0, 16) : "",
            ends_at: item.ends_at ? item.ends_at.slice(0, 16) : "",
          }
        : initialValues,
    );
  }

  async function handleSave() {
    setError(null);
    setMessage(null);
    const parsed = sponsoredItemSchema.safeParse(values);
    if (!parsed.success) {
      setError(t("admin.validationError"));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveSponsoredItem(
        {
          title: values.title,
          description: values.description,
          image_url: values.image_url,
          destination_url: values.destination_url,
          merchant_id: values.merchant_id || undefined,
          category: values.category,
          occasion: values.occasion,
          price: values.price ? Number(values.price) : undefined,
          currency: values.currency,
          locale: values.locale,
          status: values.status,
          priority: Number(values.priority),
          starts_at: values.starts_at ? new Date(values.starts_at).toISOString() : undefined,
          ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : undefined,
        },
        selectedItem,
      );
      setItems((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
      });
      setMessage(t("admin.saved"));
      editItem(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(item: SponsoredItemRecord, status: SponsoredItemRecord["status"]) {
    setError(null);
    setMessage(null);
    try {
      const saved = await updateSponsoredItemStatus(item, status);
      setItems((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
      setMessage(t("admin.saved"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("common.error"));
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-coral">{t("admin.admin")}</p>
          <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("admin.sponsoredItems")}</h1>
        </div>
        <SecondaryButton onClick={() => editItem(null)}>{t("admin.createSponsoredItem")}</SecondaryButton>
      </header>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-terracotta">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
          {loading ? (
            <LoadingState
              title={t("common.loadingTitle")}
              body={t("common.loadingBody")}
              timeoutTitle={t("common.loadingTimeoutTitle")}
              timeoutBody={t("common.loadingTimeoutBody")}
              retryLabel={t("common.retry")}
              redirectTo="/admin"
              redirectLabel={t("admin.dashboard")}
              onRetry={() => window.location.reload()}
            />
          ) : null}
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-[24px] bg-warm-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-warm-900">{item.title}</p>
                    <p className="text-sm text-warm-500">{item.destination_url}</p>
                    <p className="mt-1 text-xs text-warm-500">
                      {t(`adminCampaignStatus.${item.status}`)} · {t(`adminLocale.${item.locale}`)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => editItem(item)}>{t("admin.editSponsoredItem")}</SecondaryButton>
                    <SecondaryButton onClick={() => void handleStatus(item, item.status === "active" ? "paused" : "active")}>
                      {item.status === "active" ? t("adminCampaignStatus.paused") : t("adminCampaignStatus.active")}
                    </SecondaryButton>
                    <SecondaryButton onClick={() => void handleStatus(item, "archived")}>{t("adminCampaignStatus.archived")}</SecondaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
          <h2 className="text-lg font-bold text-warm-900">
            {selectedItem ? t("admin.editSponsoredItem") : t("admin.createSponsoredItem")}
          </h2>
          <div className="mt-4 grid gap-4">
            <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("admin.title")} value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} />
            <textarea className="min-h-24 rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("admin.description")} value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
            <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("admin.destinationUrl")} value={values.destination_url} onChange={(event) => setValues((current) => ({ ...current, destination_url: event.target.value }))} />
            <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("giftForm.productImage")} value={values.image_url} onChange={(event) => setValues((current) => ({ ...current, image_url: event.target.value }))} />
            <select className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.merchant_id} onChange={(event) => setValues((current) => ({ ...current, merchant_id: event.target.value }))}>
              <option value="">{t("admin.noMerchant")}</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("admin.category")} value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))} />
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("create.occasion")} value={values.occasion} onChange={(event) => setValues((current) => ({ ...current, occasion: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("giftForm.estimatedPrice")} value={values.price} onChange={(event) => setValues((current) => ({ ...current, price: event.target.value }))} />
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("common.currency")} value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value }))} />
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" placeholder={t("admin.priority")} value={values.priority} onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <select className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.locale} onChange={(event) => setValues((current) => ({ ...current, locale: event.target.value as typeof values.locale }))}>
                <option value="all">All</option>
                <option value="en">EN</option>
                <option value="pt-BR">PT-BR</option>
              </select>
              <select className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as typeof values.status }))}>
                <option value="draft">{t("adminCampaignStatus.draft")}</option>
                <option value="active">{t("adminCampaignStatus.active")}</option>
                <option value="paused">{t("adminCampaignStatus.paused")}</option>
                <option value="archived">{t("adminCampaignStatus.archived")}</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="datetime-local" className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.starts_at} onChange={(event) => setValues((current) => ({ ...current, starts_at: event.target.value }))} />
              <input type="datetime-local" className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.ends_at} onChange={(event) => setValues((current) => ({ ...current, ends_at: event.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={() => void handleSave()} disabled={saving}>{t("admin.save")}</PrimaryButton>
              <SecondaryButton onClick={() => editItem(null)}>{t("actions.cancel")}</SecondaryButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
