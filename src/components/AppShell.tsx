import { Link, Outlet } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { LanguageSelector } from "./LanguageSelector";
import { WishlyLogo } from "./WishlyLogo";

export function AppShell() {
  return (
    <div className="min-h-screen bg-cream text-warm-900">
      <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-32 pt-5 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex rounded-full bg-porcelain px-3 py-2 shadow-card ring-1 ring-warm-100 focus:outline-none focus:ring-4 focus:ring-coral/15"
            aria-label="Wishly"
          >
            <WishlyLogo size="sm" />
          </Link>
          <LanguageSelector />
        </div>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
