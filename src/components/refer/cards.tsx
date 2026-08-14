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
    <div className={cn("tile p-4 sm:p-5", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="eyebrow min-w-0 truncate text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              accent ? "hairline-gold bg-gold-soft text-gold-foreground" : "bg-primary/10 text-primary",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="tabular mt-3 font-display text-2xl font-extrabold text-foreground sm:text-[1.75rem]">
        {value}
      </p>
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
    <div className="tile-dark grain p-6 sm:p-7">
      <div
        className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold/10 blur-2xl"
        aria-hidden
      />
      <p className="eyebrow relative text-primary-foreground/70">{label}</p>
      <p className="tabular relative mt-3 font-display text-4xl font-extrabold sm:text-5xl">{amount}</p>
      {footer ? <div className="relative mt-5 text-sm text-primary-foreground/80">{footer}</div> : null}
      {action ? <div className="relative mt-6">{action}</div> : null}
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
