import { useEffect, useState } from "react";
import { LoadingState } from "../components/LoadingState";
import { listAdminAuditLogs, listAffiliateMerchants, listSponsoredItems } from "../services/admin";
import type { AdminAuditLogRecord, AffiliateMerchantRecord, SponsoredItemRecord } from "../types/domain";
import { useTranslation } from "../i18n/useTranslation";
import { EmptyState } from "../components/States";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-modal bg-surface p-5 shadow-card ring-1 ring-border">
      <p className="text-sm font-semibold text-warm-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-warm-900">{value}</p>
    </section>
  );
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [merchants, setMerchants] = useState<AffiliateMerchantRecord[]>([]);
  const [sponsoredItems, setSponsoredItems] = useState<SponsoredItemRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([listAffiliateMerchants(), listSponsoredItems(), listAdminAuditLogs()])
      .then(([nextMerchants, nextSponsoredItems, nextAuditLogs]) => {
        if (!active) return;
        setMerchants(nextMerchants);
        setSponsoredItems(nextSponsoredItems);
        setAuditLogs(nextAuditLogs);
      })
      .catch((nextError) => {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : t("common.error"));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [t]);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return <p className="text-sm text-primary-strong">{error}</p>;
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold text-primary">{t("admin.admin")}</p>
        <h1 className="mt-1 text-3xl font-bold text-warm-900">{t("admin.dashboard")}</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("admin.affiliateMerchants")} value={merchants.length} />
        <StatCard label={t("admin.sponsoredItems")} value={sponsoredItems.length} />
        <StatCard
          label={t("admin.activeSponsoredItems")}
          value={sponsoredItems.filter((item) => item.status === "active").length}
        />
        <StatCard
          label={t("admin.pausedCampaigns")}
          value={sponsoredItems.filter((item) => item.status === "paused").length}
        />
      </div>

      <section className="rounded-modal bg-surface p-5 shadow-card ring-1 ring-border">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-warm-900">{t("admin.recentActivity")}</h2>
        </div>
        {auditLogs.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={t("common.empty")} body={t("admin.noRecentActivity")} />
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-card bg-warm-50/60 p-4">
                <p className="text-sm font-semibold text-warm-900">{log.action}</p>
                <p className="mt-1 text-xs text-warm-500">
                  {log.entity_type} · {log.admin_email}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
