import { Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { AdminShell } from "./components/AdminShell";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { AdminAffiliatesPage } from "./pages/AdminAffiliatesPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { AdminSponsoredItemsPage } from "./pages/AdminSponsoredItemsPage";
import { AddGiftPage } from "./pages/AddGiftPage";
import { CreateWishlistPage } from "./pages/CreateWishlistPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { GoGiftPage } from "./pages/GoGiftPage";
import { HomePage } from "./pages/HomePage";
import { InfoPage } from "./pages/InfoPage";
import { LandingPage } from "./pages/LandingPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { ListIndexPage } from "./pages/ListIndexPage";
import { PremiumRadarPage } from "./pages/PremiumRadarPage";
import { LoginPage } from "./pages/LoginPage";
import { MockCheckoutPage } from "./pages/MockCheckoutPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SignupPage } from "./pages/SignupPage";
import { VisitorPage } from "./pages/VisitorPage";
import { WishlistDetailPage } from "./pages/WishlistDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<InfoPage />} />
      <Route path="/terms" element={<InfoPage />} />
      <Route path="/contact" element={<InfoPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app" element={<HomePage />} />
          <Route path="/lists" element={<ListIndexPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/lists/:id" element={<WishlistDetailPage />} />
          <Route path="/create" element={<CreateWishlistPage />} />
          <Route path="/gift/new" element={<AddGiftPage />} />
          <Route path="/premium/radar-de-precos" element={<PremiumRadarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="affiliates" element={<AdminAffiliatesPage />} />
          <Route path="sponsored-items" element={<AdminSponsoredItemsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Route>
      <Route path="/go/gift/:giftId" element={<GoGiftPage />} />
      {import.meta.env.DEV ? (
        <Route path="/checkout/mock/:contributionId" element={<MockCheckoutPage />} />
      ) : null}
      <Route path="/w/:shareId" element={<VisitorPage />} />
    </Routes>
  );
}
