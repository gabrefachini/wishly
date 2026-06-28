import { BarChart3, BellRing, ShieldCheck, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";

export function PremiumRadarPage() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[36px] bg-warm-900 text-white shadow-soft">
        <div className="grid gap-6 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
          <div className="grid gap-4">
            <p className="text-sm font-semibold text-blush">{t("priceRadar.upgradeEyebrow")}</p>
            <h1 className="text-3xl font-bold leading-tight">{t("priceRadar.upgradeTitle")}</h1>
            <p className="text-sm leading-6 text-warm-100">{t("priceRadar.upgradeBody")}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/lists"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
              >
                {t("actions.backToWishlist")}
              </Link>
            </div>
            <p className="text-xs leading-6 text-warm-200">{t("priceRadar.freeLimit")}</p>
          </div>
          <div className="grid gap-3 rounded-[30px] bg-white/10 p-4">
            <BenefitRow icon={BarChart3} title={t("priceRadar.benefitTracking")} />
            <BenefitRow icon={BellRing} title={t("priceRadar.benefitAlerts")} />
            <BenefitRow icon={Target} title={t("priceRadar.benefitTarget")} />
            <BenefitRow icon={ShieldCheck} title={t("priceRadar.benefitHistory")} />
          </div>
        </div>
      </section>
    </div>
  );
}

function BenefitRow({
  icon: Icon,
  title,
}: {
  icon: typeof BarChart3;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-white/10 px-4 py-3">
      <Icon size={18} aria-hidden="true" className="text-blush" />
      <p className="text-sm font-medium text-white">{title}</p>
    </div>
  );
}
