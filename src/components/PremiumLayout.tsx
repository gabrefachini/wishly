import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type PremiumPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PremiumPageShell({ children, className = "" }: PremiumPageShellProps) {
  return <div className={joinClasses("grid gap-6 lg:gap-7", className)}>{children}</div>;
}

type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return <div className={joinClasses("grid gap-4 lg:gap-5", className)}>{children}</div>;
}

type BentoCardProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "soft" | "dark" | "accent";
};

const toneClasses: Record<NonNullable<BentoCardProps["tone"]>, string> = {
  default: "bg-surface text-warm-900 ring-border shadow-card",
  soft: "bg-surface-alt text-warm-900 ring-border shadow-card",
  dark: "bg-warm-900 text-white ring-warm-900 shadow-soft",
  accent: "bg-blush text-warm-900 ring-border shadow-card",
};

export function BentoCard({
  children,
  className = "",
  tone = "default",
}: BentoCardProps) {
  return (
    <section
      className={joinClasses(
        "relative overflow-hidden rounded-[32px] p-5 ring-1 sm:p-6",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  align?: "left" | "between";
};

export function SectionHeader({
  eyebrow,
  title,
  body,
  action,
  align = "between",
}: SectionHeaderProps) {
  return (
    <div className={joinClasses("gap-4", align === "between" ? "grid sm:grid-cols-[1fr_auto] sm:items-end" : "grid")}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-coral">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.35rem)] font-bold tracking-[-0.03em] text-inherit">{title}</h2>
        {body ? <p className="mt-3 text-sm leading-7 text-warm-500 sm:text-[15px]">{body}</p> : null}
      </div>
      {action ? <div className="sm:justify-self-end">{action}</div> : null}
    </div>
  );
}

type MetricBentoCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
  accent?: "coral" | "lavender" | "emerald" | "sky";
  className?: string;
};

const metricAccentClasses = {
  coral: "bg-blush text-terracotta",
  lavender: "bg-lavender text-warm-900",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-surface-alt text-warm-700",
};

export function MetricBentoCard({
  icon: Icon,
  label,
  value,
  note,
  accent = "coral",
  className = "",
}: MetricBentoCardProps) {
  return (
    <BentoCard className={joinClasses("grid gap-4 p-4 sm:p-5", className)} tone="soft">
      <div className={joinClasses("inline-flex h-11 w-11 items-center justify-center rounded-2xl", metricAccentClasses[accent])}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warm-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-warm-900">{value}</p>
        {note ? <p className="mt-2 text-sm leading-6 text-warm-500">{note}</p> : null}
      </div>
    </BentoCard>
  );
}

type ActionBentoCardProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  action: ReactNode;
  className?: string;
};

export function ActionBentoCard({
  icon: Icon,
  title,
  body,
  action,
  className = "",
}: ActionBentoCardProps) {
  return (
    <BentoCard className={joinClasses("grid gap-4", className)} tone="soft">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-900 text-white shadow-card">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-[-0.02em] text-warm-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-warm-500">{body}</p>
      </div>
      <div>{action}</div>
    </BentoCard>
  );
}
