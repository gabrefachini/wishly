import { useAuth } from "../auth/useAuth";
import { env } from "../lib/env";
import { useTranslation } from "../i18n/useTranslation";

export function AdminSettingsPage() {
  const { session } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold text-coral">{t("admin.admin")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("admin.settings")}</h1>
      </header>

      <section className="rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        <dl className="grid gap-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">{t("admin.currentAdminEmail")}</dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">{session?.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">{t("admin.affiliateDisclosureEnabled")}</dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">
              {env.affiliateDisclosureEnabled ? "true" : "false"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">{t("admin.defaultAffiliateBehavior")}</dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">database-driven fallback</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">{t("admin.supportedLocales")}</dt>
            <dd className="mt-1 text-base font-semibold text-warm-900">en, pt-BR</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[32px] bg-porcelain p-5 shadow-card ring-1 ring-warm-100">
        <h2 className="text-lg font-bold text-warm-900">{t("admin.requiredEnv")}</h2>
        <ul className="mt-4 grid gap-2 text-sm text-warm-600">
          <li>VITE_AFFILIATE_DISCLOSURE_ENABLED</li>
          <li>MERCADOLIVRE_AFFILIATE_TAG in Supabase Vault</li>
          <li>SHEIN_AFFILIATE_TAG in Supabase Vault</li>
        </ul>
      </section>
    </div>
  );
}
