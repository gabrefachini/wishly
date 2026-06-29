import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "../lib/validation";
import { getFriendlyAuthErrorMessage } from "../lib/authErrors";
import { useTranslation } from "../i18n/useTranslation";
import { resendSignupConfirmation, signInWithPassword } from "../services/auth";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { SetupNotice } from "../components/SetupNotice";
import { WishlyLogo } from "../components/WishlyLogo";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";
import { updateMetadata } from "../lib/metadata";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    updateMetadata({
      title: `${t("actions.logIn")} — Wishly`,
      description: t("auth.welcomeBack"),
    });
  }, [t]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextEmail = params.get("email");
    const nextNotice = params.get("notice");

    if (nextEmail) {
      setEmail(nextEmail);
    }

    if (nextNotice === "confirm-email") {
      setNotice(t("auth.confirmEmailNotice"));
    }
  }, [location.search, t]);

  if (!hasSupabaseEnv && !isDemoMode) {
    return (
      <main className="min-h-screen bg-cream px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6">
          <SetupNotice />
        </div>
      </main>
    );
  }

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    setNeedsEmailConfirmation(false);
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
      navigate(params.get("next") || "/app");
    } catch (submitError) {
      const rawMessage = submitError instanceof Error ? submitError.message.toLowerCase() : "";
      const message = getFriendlyAuthErrorMessage(submitError, t);
      if (rawMessage.includes("email not confirmed")) {
        setNeedsEmailConfirmation(true);
        setError(t("auth.emailNotConfirmed"));
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setError(null);
    setNotice(null);

    const parsed = loginSchema.pick({ email: true }).safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("validation.required"));
      return;
    }

    setResendingConfirmation(true);
    try {
      const { error: resendError } = await resendSignupConfirmation(email);
      if (resendError) {
        throw resendError;
      }

      setNotice(t("auth.confirmationResent"));
    } catch (submitError) {
      setError(getFriendlyAuthErrorMessage(submitError, t));
    } finally {
      setResendingConfirmation(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-md gap-6">
        <section className="rounded-[36px] bg-porcelain p-6 shadow-soft ring-1 ring-warm-100">
          <div className="mb-5 flex justify-center">
            <WishlyLogo size="md" />
          </div>
          <h1 className="text-3xl font-bold text-warm-900">{t("actions.logIn")}</h1>
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("auth.email")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("auth.password")}</span>
              <input
                className="min-h-12 rounded-2xl border border-warm-100 bg-porcelain px-4"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {notice ? <p className="text-sm text-warm-600">{notice}</p> : null}
            {error ? <p className="text-sm text-terracotta">{error}</p> : null}
            {needsEmailConfirmation ? (
              <SecondaryButton
                type="button"
                onClick={() => void handleResendConfirmation()}
                disabled={resendingConfirmation}
                className="w-full"
              >
                {resendingConfirmation ? t("auth.resendingConfirmation") : t("auth.resendConfirmation")}
              </SecondaryButton>
            ) : null}
            <PrimaryButton type="submit" disabled={loading}>
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
          </form>
        </section>
      </div>
    </main>
  );
}
