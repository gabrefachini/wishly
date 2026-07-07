import { Compass, Home, ListChecks, Radar, UserRound } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";

const items = [
  { to: "/app", labelKey: "nav.home", icon: Home },
  { to: "/lists", labelKey: "nav.lists", icon: ListChecks },
  { to: "/radar", labelKey: "nav.radar", icon: Radar },
  { to: "/discover", labelKey: "nav.discover", icon: Compass },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound },
];

export function BottomNavigation() {
  const { t } = useTranslation();
  const location = useLocation();

  function isActiveTab(path: string) {
    if (path === "/app") {
      return location.pathname === "/app";
    }

    if (path === "/lists") {
      return (
        location.pathname.startsWith("/lists") ||
        location.pathname === "/create" ||
        location.pathname.startsWith("/gift/new")
      );
    }

    if (path === "/discover") {
      return location.pathname.startsWith("/discover");
    }

    if (path === "/radar") {
      return location.pathname.startsWith("/radar") || location.pathname.startsWith("/premium/radar-de-precos");
    }

    if (path === "/profile") {
      return location.pathname.startsWith("/profile");
    }

    return location.pathname === path;
  }

  return (
    <nav
      aria-label={t("nav.primary")}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-6xl px-4 pb-4 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-5 rounded-modal border border-border bg-surface p-2 shadow-soft">
        {items.map((item) => (
          <NavLink
            key={item.labelKey}
            to={item.to}
            className={() =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-ctrl text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/15 ${
                isActiveTab(item.to)
                  ? "bg-sunken text-primary-strong shadow-card"
                  : "text-warm-500 hover:bg-sunken"
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
