import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema } from "../lib/validation";
import { normalizeErrorMessage } from "../lib/http";
import { useTranslation } from "../i18n/useTranslation";
import { resetPassword } from "../services/auth";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { SetupNotice } from "../components/SetupNotice";
import { hasSupabaseEnv, isDemoMode } from "../lib/env";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasSupabaseEnv && !isDemoMode) {
    return (
      <main className="min-h-screen bg-page px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-3xl gap-6">
          <SetupNotice />
        </div>
      </main>
    );
  }

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("validation.email"));
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        throw resetError;
      }
      setMessage(t("auth.resetSent"));
    } catch (submitError) {
      setError(normalizeErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-page px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-md gap-6">
        <section className="rounded-modal bg-surface p-6 shadow-soft ring-1 ring-border">
          <p className="text-sm font-semibold text-primary">{t("auth.checkEmail")}</p>
          <h1 className="mt-2 text-3xl font-bold text-warm-900">{t("auth.resetPasswordTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-warm-500">{t("auth.resetPasswordBody")}</p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-warm-700">{t("auth.email")}</span>
              <input
                className="min-h-12 rounded-ctrl border border-border bg-surface px-4"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-primary-strong">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            <PrimaryButton onClick={handleSubmit} disabled={loading}>
              {t("actions.continue")}
            </PrimaryButton>
            <Link to="/login">
              <SecondaryButton type="button" className="w-full">
                {t("actions.logIn")}
              </SecondaryButton>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
