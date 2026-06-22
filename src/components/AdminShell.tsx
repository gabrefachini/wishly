import { LayoutGrid, Megaphone, Settings2, Store, Undo2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { WishlyLogo } from "./WishlyLogo";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "./LanguageSelector";

const navItems = [
  { to: "/admin", labelKey: "admin.dashboard", icon: LayoutGrid, end: true },
  { to: "/admin/affiliates", labelKey: "admin.affiliateMerchants", icon: Store },
  { to: "/admin/sponsored-items", labelKey: "admin.sponsoredItems", icon: Megaphone },
  { to: "/admin/settings", labelKey: "admin.settings", icon: Settings2 },
];

export function AdminShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-cream text-warm-900">
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-full bg-porcelain px-4 py-2 shadow-card ring-1 ring-warm-100">
            <WishlyLogo size="sm" />
            <span className="text-sm font-semibold text-warm-500">{t("admin.admin")}</span>
          </div>
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-porcelain px-4 py-2 text-sm font-semibold text-warm-700 shadow-card ring-1 ring-warm-100"
            >
              <Undo2 size={16} aria-hidden="true" />
              {t("admin.backToApp")}
            </NavLink>
            <LanguageSelector />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-[32px] bg-porcelain p-3 shadow-card ring-1 ring-warm-100">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blush text-terracotta"
                        : "text-warm-600 hover:bg-warm-50"
                    }`
                  }
                >
                  <item.icon size={18} aria-hidden="true" />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
