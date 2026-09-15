import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CATEGORY_GROUPS, type GroupId } from "@/lib/taxonomy";
import { useI18n, baseLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const INTERVAL = 7000;

/**
 * Calm rotating hero across the ASH verticals. Pauses on hover/focus and
 * respects reduced-motion by simply not auto-advancing.
 */
export function CategoryHero({ onSelect }: { onSelect: (group: GroupId) => void }) {
  const { lang } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % CATEGORY_GROUPS.length), INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused]);

  const group = CATEGORY_GROUPS[index]!;

  return (
    <section
      className="relative overflow-hidden rounded-[calc(var(--radius)+12px)] border border-border bg-primary-deep"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {CATEGORY_GROUPS.map((item, i) => (
        <img
          key={item.id}
          src={item.image}
          alt=""
          width={1280}
          height={800}
          loading={i === 0 ? "eager" : "lazy"}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div
        className="absolute inset-0 bg-[linear-gradient(100deg,oklch(0.14_0.022_283/0.92)_8%,oklch(0.14_0.022_283/0.55)_58%,transparent_100%)]"
        aria-hidden
      />

      <div key={group.id} className="ash-fade-slide relative flex min-h-[260px] flex-col justify-end gap-3 p-5 sm:min-h-[320px] sm:p-8">
        <span className="eyebrow w-fit rounded-full border border-[color:oklch(1_0_0_/_0.28)] bg-[oklch(0_0_0_/_0.35)] px-2.5 py-1 text-on-dark">
          {group.label[baseLang(lang)]}
        </span>
        <h2 className="max-w-md font-display text-2xl font-extrabold leading-tight text-on-dark sm:text-4xl">
          {group.headline[baseLang(lang)]}
        </h2>
        <p className="max-w-md text-sm text-[color:oklch(0.98_0.004_285_/_0.78)]">{group.copy[baseLang(lang)]}</p>

        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            onClick={() => onSelect(group.id)}
            className="brand-gradient inline-flex w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-on-dark shadow-[var(--shadow-brand)] transition-transform hover:scale-[1.02]"
          >
            {lang === "fr" ? "Explorer" : "Explore"}
            <ArrowRight className="size-4" aria-hidden />
          </button>

          <div className="flex items-center gap-1.5">
            {CATEGORY_GROUPS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label[baseLang(lang)]}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-on-dark" : "w-1.5 bg-[oklch(1_0_0_/_0.45)]",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
