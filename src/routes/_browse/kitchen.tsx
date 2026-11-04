import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_browse/kitchen")({
  head: () => ({
    meta: [
      { title: "ASH Kitchen — food, coming soon" },
      {
        name: "description",
        content:
          "ASH Kitchen is preparing to welcome restaurants, bakeries, groceries, caterers and private chefs. Sell food on ASH Kitchen.",
      },
      { property: "og:title", content: "ASH Kitchen — food, coming soon" },
      {
        property: "og:description",
        content: "ASH Kitchen is preparing to welcome genuine food vendors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitchenPage,
});

const FUTURE_CATEGORIES = [
  { en: "Restaurants", fr: "Restaurants" },
  { en: "Bakeries", fr: "Boulangeries" },
  { en: "Groceries", fr: "Épiceries" },
  { en: "Catering", fr: "Traiteurs" },
  { en: "Private chefs", fr: "Chefs privés" },
];

/** Abstract gold line-art: a cloche with slowly rising steam, fork and spoon. */
function ClocheArt() {
  return (
    <svg
      viewBox="0 0 220 160"
      className="mx-auto h-40 w-auto text-brass"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* steam — drifts slowly, stops under reduced motion */}
      <g className="kitchen-steam" opacity="0.85">
        <path d="M88 44c-4-6 4-10 0-16" />
        <path d="M110 40c-4-6 4-10 0-16" />
        <path d="M132 44c-4-6 4-10 0-16" />
      </g>
      {/* cloche dome */}
      <path d="M60 96a50 50 0 0 1 100 0" />
      <circle cx="110" cy="42" r="4" fill="currentColor" stroke="none" />
      {/* serving plate */}
      <path d="M44 96h132" />
      <path d="M58 106h104" opacity="0.6" />
      {/* fork */}
      <g opacity="0.8">
        <path d="M26 60v18" />
        <path d="M20 60v10c0 4 12 4 12 0V60" />
        <path d="M26 78v26" />
      </g>
      {/* spoon */}
      <g opacity="0.8">
        <ellipse cx="194" cy="64" rx="7" ry="10" />
        <path d="M194 74v30" />
      </g>
    </svg>
  );
}

function KitchenPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  return (
    <div className="relative mx-auto flex min-h-[70dvh] w-full max-w-xl flex-col items-center justify-center overflow-hidden rounded-3xl border border-border bg-onyx px-6 py-16 text-center">
      {/* soft royal-purple glow behind the illustration, faint gold at one corner */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 32%, rgba(75,0,130,0.45), transparent 72%), radial-gradient(30% 25% at 88% 90%, rgba(212,175,55,0.14), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="kitchen-enter relative flex flex-col items-center">
        <ClocheArt />

        <h1 className="mt-6 font-display text-[28px] font-bold leading-8 text-[#F5F5F7]">
          ASH Kitchen
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#A1A1AA]">
          {tx(
            "ASH Kitchen is preparing to welcome genuine food vendors — restaurants, bakeries, caterers and private chefs.",
            "ASH Kitchen se prépare à accueillir de véritables vendeurs de nourriture — restaurants, boulangeries, traiteurs et chefs privés.",
          )}
        </p>

        <p className="mt-8 text-[11px] font-bold uppercase tracking-widest text-[#A1A1AA]">
          {tx("Coming to ASH Kitchen", "Bientôt sur ASH Kitchen")}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {FUTURE_CATEGORIES.map((c) => (
            <span
              key={c.en}
              className="rounded-full border border-brass/35 px-3 py-1 text-xs font-semibold text-[#F5F5F7]"
            >
              {fr ? c.fr : c.en}
            </span>
          ))}
        </div>

        <Link
          to="/studio"
          className="mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-brass px-6 text-sm font-bold text-onyx shadow-[0_10px_30px_-10px_rgba(212,175,55,0.5)] transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-onyx motion-safe:hover:scale-[1.03] active:scale-[0.98]"
        >
          {tx("Sell food on ASH Kitchen", "Vendre sur ASH Kitchen")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
