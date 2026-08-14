import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("surface-card p-4 sm:p-5", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg",
              accent ? "bg-gold/20 text-gold-foreground" : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="tabular mt-2 text-2xl font-bold text-foreground sm:text-[1.75rem]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function BalanceCard({
  label,
  amount,
  footer,
  action,
}: {
  label: string;
  amount: string;
  footer?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="brand-gradient relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-raised)]">
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary-foreground/10"
        aria-hidden
      />
      <p className="text-sm font-medium text-primary-foreground/80">{label}</p>
      <p className="tabular mt-2 text-4xl font-bold sm:text-5xl">{amount}</p>
      {footer ? <div className="mt-5 text-sm text-primary-foreground/85">{footer}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-5 sm:p-6", className)}>
      {title ? (
        <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-foreground">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
