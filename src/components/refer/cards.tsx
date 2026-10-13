import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

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
        <p className="eyebrow min-w-0 break-words text-muted-foreground">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              accent
                ? "hairline-gold bg-gold-soft text-gold-foreground"
                : "bg-primary/10 text-primary",
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
  holder,
  last4,
  gold = false,
}: {
  label: string;
  amount: string;
  footer?: ReactNode;
  action?: ReactNode;
  holder?: string | undefined;
  last4?: string;
  gold?: boolean;
}) {
  const { tx } = useI18n();
  return (
    <div className={cn(gold ? "virtual-card-gold" : "virtual-card", "p-5 sm:p-7")}>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="tabular mt-2 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {amount}
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-lg font-extrabold">ASH</span>
          <span className="mt-1 block text-[10px] font-medium opacity-60">GLO</span>
        </div>
      </div>

      <div className="relative mt-6 flex items-center gap-3">
        <span className="card-chip block h-7 w-10 rounded-[6px]" aria-hidden />
        <svg viewBox="0 0 24 24" className="size-5 opacity-70" fill="none" aria-hidden>
          <path
            d="M6 8a8 8 0 0 1 0 8M10.5 5.5a12 12 0 0 1 0 13M15 3a16 16 0 0 1 0 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p className="tabular relative mt-4 text-lg font-medium sm:text-xl">
        {last4 ? `•••• •••• •••• ${last4}` : "ASH Card"}
      </p>

      <div className="relative mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium opacity-60">{tx("Account holder", "Titulaire")}</p>
          <p className="truncate text-sm font-semibold">{holder ?? tx("Profile", "Profil")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold opacity-70">ASH GLO</p>
        </div>
      </div>

      {footer ? (
        <div className="relative mt-6 border-t border-current/15 pt-4 text-sm opacity-90">
          {footer}
        </div>
      ) : null}
      {action ? <div className="relative mt-5">{action}</div> : null}
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
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
