import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "../lib/validation";
import { normalizeErrorMessage } from "../lib/http";
import { useTranslation } from "../i18n/useTranslation";
import { signInWithPassword } from "../services/auth";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { LanguageSelector } from "../components/LanguageSelector";
import { SetupNotice } from "../components/SetupNotice";
import { WishlyLogo } from "../components/WishlyLogo";
import { hasSupabaseEnv } from "../lib/env";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasSupabaseEnv) {
    return (
      <main className="min-h-screen bg-cream px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6">
          <div className="flex justify-end">
            <LanguageSelector />
          </div>
          <SetupNotice />
        </div>
      </main>
    );
  }

  async function handleSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("validation.required"));
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        throw authError;
      }

      const params = new URLSearchParams(location.search);
      navigate(params.get("next") || "/");
    } catch (submitError) {
      setError(normalizeErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <section className="rounded-[36px] bg-porcelain p-6 shadow-soft ring-1 ring-warm-100">
          <div className="mb-5 flex justify-center">
            <WishlyLogo size="md" />
          </div>
          <p className="text-sm font-semibold text-coral">{t("auth.welcomeBack")}</p>
          <h1 className="mt-2 text-3xl font-bold text-warm-900">{t("actions.logIn")}</h1>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("auth.email")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("auth.password")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            <PrimaryButton onClick={handleSubmit} disabled={loading}>
              {t("actions.continue")}
            </PrimaryButton>
            <div className="flex items-center justify-between gap-3 text-sm">
              <Link to="/forgot-password" className="font-semibold text-terracotta">
                {t("auth.forgotPassword")}
              </Link>
              <Link to="/signup">
                <SecondaryButton type="button">{t("actions.signUp")}</SecondaryButton>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
