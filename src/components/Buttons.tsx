import { Gift, Share2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "../i18n/useTranslation";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-terracotta focus:outline-none focus:ring-4 focus:ring-coral/25 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-warm-700 shadow-card transition hover:border-coral/35 hover:text-terracotta focus:outline-none focus:ring-4 focus:ring-coral/15 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ShareButton({ className = "", ...props }: Omit<ButtonProps, "children">) {
  const { t } = useTranslation();

  return (
    <PrimaryButton className={className} {...props}>
      <Share2 size={18} aria-hidden="true" />
      {t("actions.shareWishlist")}
    </PrimaryButton>
  );
}

export function CreateButton({ className = "", ...props }: Omit<ButtonProps, "children">) {
  const { t } = useTranslation();

  return (
    <PrimaryButton className={className} {...props}>
      <Gift size={18} aria-hidden="true" />
      {t("actions.createWishlist")}
    </PrimaryButton>
  );
}
