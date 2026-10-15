import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BadgeCheck, Briefcase, Loader2, MapPin, ShieldAlert, Sparkles, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { directory } from "@/lib/public-profiles";
import { useI18n } from "@/lib/i18n";
import { analyzeVendorTrust } from "@/lib/vendor-trust.functions";
import { Avatar, useAvatarUrl } from "./AvatarUpload";
import { VerifiedBadge } from "./VerifiedBadge";
import { useOverlayBack } from "@/lib/overlay-back";

/** Full-screen round profile photo above any viewer. */
export function ProfilePhotoOverlay({
  path,
  name,
  onClose,
}: {
  path: string | null | undefined;
  name: string;
  onClose: () => void;
}) {
  const url = useAvatarUrl(path);
  useOverlayBack(true, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={onClose}
      className="fixed inset-0 z-[160000] grid place-items-center bg-black/60 backdrop-blur-xl animate-in fade-in"
    >
      <button
        type="button"
        aria-label="Back"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 grid size-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      {url ? (
        <img
          src={url}
          alt={name}
          className="size-[min(80vw,70dvh)] rounded-full object-cover shadow-2xl animate-in zoom-in-90"
        />
      ) : (
        <Loader2 className="size-8 animate-spin text-white" aria-hidden />
      )}
    </div>,
    document.body,
  );
}

const LEVEL_STYLE = {
  recommended: "border-success/40 bg-success/15 text-success",
  good: "border-primary/40 bg-primary/15 text-primary",
  caution: "border-destructive/40 bg-destructive/15 text-destructive",
  unknown: "border-white/15 bg-white/10 text-white/80",
} as const;

/** Beautiful vendor/member profile card with ASH Intelligence trust advice. */
export function VendorProfileSheet({
  userId,
  fallbackName,
  fallbackAvatar,
  onClose,
}: {
  userId: string;
  fallbackName: string;
  fallbackAvatar?: string | null | undefined;
  onClose: () => void;
}) {
  const { tx, lang } = useI18n();
  const analyze = useServerFn(analyzeVendorTrust);
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const details = useQuery({
    queryKey: ["vendor-sheet", userId],
    queryFn: async () => {
      const [{ data: provider }, { data: profile }] = await Promise.all([
        supabase
          .from("provider_profiles")
          .select(
            "id, business_name, tagline, bio, city, country, avatar_url, cover_url, categories, is_verified, rating_avg, rating_count, completed_bookings",
          )
          .eq("user_id", userId)
          .maybeSingle(),
        directory()
          .select("full_name, username, avatar_url, verified_tier, verified_until, city")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      return { provider, profile };
    },
  });
  const trust = useQuery({
    queryKey: ["vendor-trust", userId, lang],
    queryFn: () => analyze({ data: { userId, lang } }),
    staleTime: 10 * 60_000,
  });

  const p = details.data?.provider;
  const prof = details.data?.profile as
    | { full_name?: string; username?: string; avatar_url?: string; verified_tier?: string; verified_until?: string; city?: string }
    | null
    | undefined;
  const name = p?.business_name ?? prof?.full_name ?? fallbackName;
  const avatar = p?.avatar_url ?? prof?.avatar_url ?? fallbackAvatar ?? null;
  const cover = useAvatarUrl(p?.cover_url ?? null);
  const level = trust.data?.level ?? "unknown";
  const levelLabel = {
    recommended: tx("Highly recommended", "Fortement recommandé"),
    good: tx("Good track record", "Bon historique"),
    caution: tx("Trade with caution", "Prudence"),
    unknown: tx("Not enough history yet", "Historique insuffisant"),
  }[level];
  const verified = p?.is_verified || trust.data?.facts?.verified;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[155000] flex items-end justify-center bg-black/55 backdrop-blur-xl animate-in fade-in sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-zinc-950 text-white shadow-2xl animate-in slide-in-from-bottom-8 sm:rounded-3xl"
      >
        <div className="relative h-32 bg-gradient-to-br from-primary/60 via-gold/40 to-accent/50">
          {cover ? <img src={cover} alt="" className="size-full object-cover" /> : null}
          <button
            type="button"
            onClick={onClose}
            aria-label={tx("Close", "Fermer")}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 backdrop-blur"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="-mt-12 px-5 pb-6">
          <button
            type="button"
            onClick={() => setPhotoOpen(true)}
            aria-label={tx("View profile photo", "Voir la photo de profil")}
            className="rounded-full ring-4 ring-zinc-950"
          >
            <Avatar path={avatar} name={name} className="size-24" />
          </button>
          <div className="mt-3 flex items-center gap-1.5">
            <h2 className="truncate text-xl font-extrabold">{name}</h2>
            {p?.is_verified ? (
              <BadgeCheck className="size-5 text-primary" aria-label="Verified" />
            ) : (
              <VerifiedBadge tier={prof?.verified_tier} until={prof?.verified_until} size={18} />
            )}
          </div>
          {prof?.username ? <p className="text-sm text-white/55">@{prof.username}</p> : null}
          {p?.tagline ? <p className="mt-1 text-sm text-white/80">{p.tagline}</p> : null}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="flex items-center justify-center gap-1 text-lg font-bold">
                <Star className="size-4 fill-gold text-gold" />
                {Number(p?.rating_count) > 0 ? Number(p?.rating_avg).toFixed(1) : "—"}
              </p>
              <p className="text-[10px] text-white/55">
                {Number(p?.rating_count ?? 0)} {tx("reviews", "avis")}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-lg font-bold">{Number(p?.completed_bookings ?? 0)}</p>
              <p className="text-[10px] text-white/55">{tx("completed", "terminées")}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="truncate text-sm font-bold">
                <MapPin className="mx-auto mb-0.5 size-4" />
                {p?.city ?? prof?.city ?? "—"}
              </p>
            </div>
          </div>

          {p?.bio ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{p.bio}</p>
          ) : null}
          {p?.categories?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.categories.slice(0, 6).map((c: string) => (
                <span key={c} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px]">
                  {c}
                </span>
              ))}
            </div>
          ) : null}

          <section className={`mt-5 rounded-2xl border p-4 ${LEVEL_STYLE[level]}`}>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
              {level === "caution" ? <ShieldAlert className="size-4" /> : <Sparkles className="size-4" />}
              ASH Intelligence · {trust.isLoading ? tx("Analyzing…", "Analyse…") : levelLabel}
            </p>
            {trust.isLoading ? (
              <Loader2 className="mt-3 size-4 animate-spin" />
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                {trust.data?.summary ||
                  (verified
                    ? tx(
                        "This account is verified by ASH — recommended for trading. Always pay through ASH.",
                        "Ce compte est vérifié par ASH — recommandé. Payez toujours via ASH.",
                      )
                    : tx(
                        "Limited history so far. Pay only through ASH so your money stays protected.",
                        "Historique limité. Payez uniquement via ASH pour rester protégé.",
                      ))}
              </p>
            )}
          </section>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {p?.id ? (
              <Link
                to="/services/$providerId"
                params={{ providerId: p.id }}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                <Briefcase className="size-4" />
                {tx("See their work", "Voir leur travail")}
              </Link>
            ) : null}
            <Link
              to="/u/$userId"
              params={{ userId }}
              onClick={onClose}
              className={`inline-flex items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold ${p?.id ? "" : "col-span-2"}`}
            >
              {tx("Full profile", "Profil complet")}
            </Link>
          </div>
        </div>
      </div>
      {photoOpen ? (
        <ProfilePhotoOverlay path={avatar} name={name} onClose={() => setPhotoOpen(false)} />
      ) : null}
    </div>,
    document.body,
  );
}
