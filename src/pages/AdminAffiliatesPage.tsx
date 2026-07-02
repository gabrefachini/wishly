import { useEffect, useState } from "react";
import { SecondaryButton, PrimaryButton } from "../components/Buttons";
import { LoadingState } from "../components/LoadingState";
import { useTranslation } from "../i18n/useTranslation";
import { affiliateMerchantSchema } from "../lib/validation";
import { deleteAffiliateMerchant, listAffiliateMerchants, saveAffiliateMerchant } from "../services/admin";
import type { AffiliateMerchantRecord } from "../types/domain";

type MerchantFormValues = {
  name: string;
  domain: string;
  status: AffiliateMerchantRecord["status"];
  strategy: AffiliateMerchantRecord["strategy"];
  deeplink_template: string;
  tracking_param_name: string;
  tracking_param_value_env_key: string;
  notes: string;
};

const initialValues: MerchantFormValues = {
  name: "",
  domain: "",
  status: "manual" as const,
  strategy: "passthrough" as const,
  deeplink_template: "",
  tracking_param_name: "",
  tracking_param_value_env_key: "",
  notes: "",
};

export function AdminAffiliatesPage() {
  const { t } = useTranslation();
  const [merchants, setMerchants] = useState<AffiliateMerchantRecord[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<AffiliateMerchantRecord | null>(null);
  const [values, setValues] = useState<MerchantFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listAffiliateMerchants()
      .then((data) => {
        if (active) setMerchants(data);
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

  function startEditing(merchant: AffiliateMerchantRecord | null) {
    setSelectedMerchant(merchant);
    setValues(
      merchant
        ? {
            name: merchant.name,
            domain: merchant.domain,
            status: merchant.status,
            strategy: merchant.strategy,
            deeplink_template: merchant.deeplink_template || "",
            tracking_param_name: merchant.tracking_param_name || "",
            tracking_param_value_env_key: merchant.tracking_param_value_env_key || "",
            notes: merchant.notes || "",
          }
        : initialValues,
    );
    setErrors({});
  }

  async function handleSave() {
    setMessage(null);
    setError(null);
    const parsed = affiliateMerchantSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAffiliateMerchant(values, selectedMerchant);
      const nextItems = selectedMerchant
        ? merchants.map((merchant) => (merchant.id === saved.id ? saved : merchant))
        : [saved, ...merchants];
      setMerchants(nextItems.sort((a, b) => a.name.localeCompare(b.name)));
      setMessage(t("admin.saved"));
      startEditing(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(merchant: AffiliateMerchantRecord) {
    setError(null);
    setMessage(null);
    try {
      await deleteAffiliateMerchant(merchant);
      setMerchants((current) => current.filter((item) => item.id !== merchant.id));
      if (selectedMerchant?.id === merchant.id) {
        startEditing(null);
      }
      setMessage(t("admin.deleted"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("common.error"));
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-coral">{t("admin.admin")}</p>
          <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("admin.affiliateMerchants")}</h1>
        </div>
        <SecondaryButton onClick={() => startEditing(null)}>{t("admin.createMerchant")}</SecondaryButton>
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
            {merchants.map((merchant) => (
              <div key={merchant.id} className="rounded-[24px] bg-warm-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-warm-900">{merchant.name}</p>
                    <p className="text-sm text-warm-500">{merchant.domain}</p>
                    <p className="mt-1 text-xs text-warm-500">
                      {t(`adminStatus.${merchant.status}`)} · {t(`adminStrategy.${merchant.strategy}`)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => startEditing(merchant)}>{t("admin.editMerchant")}</SecondaryButton>
                    <SecondaryButton
                      onClick={() =>
                        handleDelete({
                          ...merchant,
                        })
                      }
                    >
                      {t("admin.delete")}
                    </SecondaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
          <h2 className="text-lg font-bold text-warm-900">
            {selectedMerchant ? t("admin.editMerchant") : t("admin.createMerchant")}
          </h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("admin.merchant")}</span>
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} />
              {errors.name ? <span className="text-xs text-terracotta">{errors.name}</span> : null}
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("admin.domain")}</span>
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.domain} onChange={(event) => setValues((current) => ({ ...current, domain: event.target.value }))} />
              {errors.domain ? <span className="text-xs text-terracotta">{errors.domain}</span> : null}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-warm-700">{t("admin.status")}</span>
                <select className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.status} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as typeof values.status }))}>
                  <option value="active">{t("adminStatus.active")}</option>
                  <option value="inactive">{t("adminStatus.inactive")}</option>
                  <option value="manual">{t("adminStatus.manual")}</option>
                  <option value="unsupported">{t("adminStatus.unsupported")}</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-warm-700">{t("admin.strategy")}</span>
                <select className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.strategy} onChange={(event) => setValues((current) => ({ ...current, strategy: event.target.value as typeof values.strategy }))}>
                  <option value="query_param">query_param</option>
                  <option value="deeplink_template">deeplink_template</option>
                  <option value="manual">manual</option>
                  <option value="passthrough">passthrough</option>
                  <option value="api">api</option>
                </select>
                {errors.strategy ? <span className="text-xs text-terracotta">{errors.strategy}</span> : null}
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">Template</span>
              <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.deeplink_template} onChange={(event) => setValues((current) => ({ ...current, deeplink_template: event.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-warm-700">Tracking param</span>
                <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.tracking_param_name} onChange={(event) => setValues((current) => ({ ...current, tracking_param_name: event.target.value }))} />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-warm-700">Vault env key</span>
                <input className="rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.tracking_param_value_env_key} onChange={(event) => setValues((current) => ({ ...current, tracking_param_value_env_key: event.target.value }))} />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">Notes</span>
              <textarea className="min-h-24 rounded-2xl border border-warm-100 bg-porcelain px-4 py-3" value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            {Object.values(errors).filter(Boolean).length ? (
              <p className="text-sm text-terracotta">{t("admin.validationError")}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={() => void handleSave()} disabled={saving}>{t("admin.saveMerchant")}</PrimaryButton>
              <SecondaryButton onClick={() => startEditing(null)}>{t("actions.cancel")}</SecondaryButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
