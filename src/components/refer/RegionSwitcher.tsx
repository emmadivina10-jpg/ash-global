import { Globe } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { COUNTRIES, countryMeta } from "@/lib/region";
import { cn } from "@/lib/utils";

/**
 * Owner-only control: lets the admin view the app as any country, or as
 * "all regions" (every storefront, referral system always on).
 */
export function RegionSwitcher({ className }: { className?: string }) {
  const { isAdmin, country, detected, override, setOverride, seesEverything } = useRegion();
  if (!isAdmin) return null;

  const active = seesEverything ? "ALL" : (override ?? "");
  const meta = countryMeta(country);

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground",
        className,
      )}
      title={`Detected: ${countryMeta(detected).name}`}
    >
      <Globe className="size-3.5 text-primary" aria-hidden />
      <span aria-hidden>{seesEverything ? "🌍" : meta.flag}</span>
      <select
        aria-label="View region"
        className="bg-transparent text-xs font-semibold outline-none"
        value={active}
        onChange={(event) => setOverride(event.target.value || null)}
      >
        <option value="">Auto ({countryMeta(detected).code})</option>
        <option value="ALL">All regions</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
