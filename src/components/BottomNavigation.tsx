import { Compass, Home, ListChecks, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";

const items = [
  { to: "/app", labelKey: "nav.home", icon: Home },
  { to: "/lists", labelKey: "nav.lists", icon: ListChecks },
  { to: "/w/sofia-7", labelKey: "nav.discover", icon: Compass },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound },
];

export function BottomNavigation() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.primary")}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-3xl px-4 pb-4"
    >
      <div className="grid grid-cols-4 rounded-[28px] border border-warm-100 bg-porcelain/95 p-2 shadow-soft backdrop-blur">
        {items.map((item) => (
          <NavLink
            key={item.labelKey}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-coral/15 ${
                isActive
                  ? "bg-blush text-terracotta"
                  : "text-warm-500 hover:bg-warm-50"
              }`
            }
          >
            <item.icon size={20} aria-hidden="true" />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
