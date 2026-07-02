import { Link, Outlet } from "react-router-dom";
import { BottomNavigation } from "./BottomNavigation";
import { WishlyLogo } from "./WishlyLogo";

export function AppShell() {
  return (
    <div className="min-h-screen bg-transparent text-warm-900">
      <main className="mx-auto min-h-screen w-full max-w-[1380px] px-4 pb-32 pt-5 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-center justify-between gap-4">
          <Link
            to="/app"
            className="inline-flex rounded-full bg-surface px-3 py-2 shadow-card ring-1 ring-border focus:outline-none focus:ring-4 focus:ring-primary/15"
            aria-label="Wishly"
          >
            <WishlyLogo size="sm" />
          </Link>
        </div>
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
