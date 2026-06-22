import { CheckCircle2, Gift } from "lucide-react";
import { PrimaryButton } from "./Buttons";
import { WishlyLogo } from "./WishlyLogo";

type EmptyStateProps = {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  branded?: boolean;
};

export function EmptyState({ title, body, action, onAction, branded = false }: EmptyStateProps) {
  return (
    <section className="rounded-[32px] bg-porcelain p-8 text-center shadow-card ring-1 ring-warm-100">
      {branded ? (
        <div className="mb-5 flex justify-center">
          <WishlyLogo size="md" />
        </div>
      ) : null}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-blush text-terracotta">
        <Gift aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-warm-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-warm-500">{body}</p>
      {action ? (
        <PrimaryButton onClick={onAction} className="mt-5">
          {action}
        </PrimaryButton>
      ) : null}
    </section>
  );
}

export function SuccessState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[32px] bg-porcelain p-8 text-center shadow-card ring-1 ring-warm-100">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
        <CheckCircle2 aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-warm-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-warm-500">{body}</p>
    </section>
  );
}
