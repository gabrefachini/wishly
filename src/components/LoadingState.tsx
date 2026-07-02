import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PrimaryButton, SecondaryButton } from "./Buttons";

type LoadingStateProps = {
  title: string;
  body: string;
  timeoutTitle: string;
  timeoutBody: string;
  retryLabel: string;
  redirectLabel?: string;
  redirectTo?: string;
  onRetry?: () => void;
  timeoutMs?: number;
  className?: string;
};

export function LoadingState({
  title,
  body,
  timeoutTitle,
  timeoutBody,
  retryLabel,
  redirectLabel,
  redirectTo,
  onRetry,
  timeoutMs = 8000,
  className = "",
}: LoadingStateProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    const timeout = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [timeoutMs]);

  function handleRetry() {
    setTimedOut(false);
    onRetry?.();
  }

  return (
    <section className={`rounded-[34px] bg-surface p-8 text-center shadow-card ring-1 ring-border ${className}`}>
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-3xl ${
          timedOut ? "bg-blush text-terracotta" : "bg-blush text-coral"
        }`}
      >
        {timedOut ? <AlertCircle aria-hidden="true" /> : <Loader2 className="animate-spin" aria-hidden="true" />}
      </div>
      <h2 className="mt-5 text-xl font-bold text-warm-900">{timedOut ? timeoutTitle : title}</h2>
      <p className="mt-2 text-sm leading-6 text-warm-500">{timedOut ? timeoutBody : body}</p>

      {timedOut ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PrimaryButton type="button" onClick={handleRetry}>
            <RotateCcw size={16} aria-hidden="true" />
            {retryLabel}
          </PrimaryButton>
          {redirectTo && redirectLabel ? (
            <Link to={redirectTo} className="contents">
              <SecondaryButton type="button">{redirectLabel}</SecondaryButton>
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
