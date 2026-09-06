import { useEffect, useState, type ReactNode } from "react";
import { Banknote, CreditCard, Headphones, Mail, MapPin, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AssistantPanel } from "./AssistantPanel";
import { AshMark } from "./AshMark";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { cn } from "@/lib/utils";

type OrbAction = "ai" | "support" | "location" | "card" | "bank";

const RADIUS = 118;

export function AshOrb() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<OrbAction | null>(null);
  const { location, request, busy } = useLocation();

  // Draggable orb. The wrapper is anchored bottom-right, so the offset is
  // always negative-or-zero and clamped to the viewport: the button can be
  // moved out of the way but never off-screen.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ash-orb-offset");
      if (raw) {
        const parsed = JSON.parse(raw) as { x: number; y: number };
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") setOffset(parsed);
      }
    } catch {
      /* ignore unreadable storage */
    }
  }, []);

  function clamp(x: number, y: number) {
    const maxLeft = Math.max(0, window.innerWidth - 96);
    const maxUp = Math.max(0, window.innerHeight - 180);
    return { x: Math.min(0, Math.max(-maxLeft, x)), y: Math.min(0, Math.max(-maxUp, y)) };
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    drag.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.px;
    const dy = event.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setOffset(clamp(d.ox + dx, d.oy + dy));
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (d.moved) {
      try {
        window.localStorage.setItem("ash-orb-offset", JSON.stringify(offset));
      } catch {
        /* ignore unwritable storage */
      }
      return;
    }
    setOpen((value) => !value);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPanel(null);
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items: { id: OrbAction; label: string; icon: ReactNode; soon?: boolean }[] = [
    { id: "ai", label: fr ? "Assistant IA" : "AI Assistant", icon: <AshMark className="size-5" /> },
    { id: "support", label: fr ? "Support ASH" : "ASH Support", icon: <Headphones className="size-5" /> },
    { id: "location", label: fr ? "Localisation" : "Location", icon: <MapPin className="size-5" /> },
    { id: "card", label: fr ? "Carte ASH" : "ASH Card", icon: <CreditCard className="size-5" />, soon: true },
    { id: "bank", label: fr ? "ASH Bank" : "ASH Bank", icon: <Banknote className="size-5" />, soon: true },
  ];

  return (
    <>
      {/* Soft blur veil behind the expanded arc. */}
      {open ? (
        <button
          type="button"
          aria-label={fr ? "Fermer le menu ASH" : "Close ASH menu"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/55 backdrop-blur-md"
        />
      ) : null}

      <div
        style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
        className="fixed bottom-24 right-4 z-50 touch-none lg:bottom-8 lg:right-8"
      >
        {/* Quarter-circle arc: items fan up and to the left, thumb-reachable.
            The radial offset lives on the wrapper because the entrance
            animation owns `transform` on the button itself. */}
        {open
          ? items.map((item, index) => {
              const angle = (index / (items.length - 1)) * 92 + 2; // degrees, up → left
              const rad = (angle * Math.PI) / 180;
              const dx = -Math.sin(rad) * RADIUS;
              const dy = -Math.cos(rad) * RADIUS;
              return (
                <div
                  key={item.id}
                  style={{ transform: `translate3d(${dx}px, ${dy}px, 0)` }}
                  className="absolute bottom-1.5 right-1.5"
                >
                  <button
                    type="button"
                    aria-label={item.label}
                    onClick={() => {
                      setPanel(item.id);
                      setOpen(false);
                    }}
                    style={{ animationDelay: `${index * 45}ms` }}
                    className="ash-rise ash-glass grid size-14 place-items-center rounded-full text-foreground shadow-[var(--shadow-card)] transition-[scale] duration-200 hover:scale-105"
                  >
                    <span className="grid place-items-center text-primary">{item.icon}</span>
                  </button>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-bold text-background">
                    {item.label}
                    {item.soon ? ` · ${fr ? "Bientôt" : "Soon"}` : ""}
                  </span>
                </div>
              );
            })
          : null}


        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? (fr ? "Fermer ASH" : "Close ASH") : (fr ? "Ouvrir ASH" : "Open ASH")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          className={cn(
            "orb-surface relative grid size-16 place-items-center rounded-full transition-transform duration-300",
            open ? "rotate-45 scale-95" : "ash-ring hover:scale-105",
          )}
        >
          {open ? <X className="size-6" aria-hidden /> : <AshMark className="size-7" />}
        </button>
      </div>

      <OrbPanel
        open={panel !== null}
        onClose={() => setPanel(null)}
        title={
          panel === "ai"
            ? t("ai.title")
            : panel === "support"
              ? fr
                ? "Support ASH"
                : "ASH Support"
              : panel === "location"
                ? fr
                  ? "Votre position"
                  : "Your location"
                : panel === "card"
                  ? "ASH Card"
                  : "ASH Bank"
        }
        subtitle={
          panel === "ai"
            ? t("ai.subtitle")
            : panel === "support"
              ? fr
                ? "Comment pouvons-nous vous aider ?"
                : "How can we help you?"
              : panel === "location"
                ? fr
                  ? "Découvrez ce qu'il y a autour de vous."
                  : "Discover what's around you."
                : fr
                  ? "Bientôt disponible"
                  : "Coming soon"
        }
        tall={panel === "ai"}
      >
        {panel === "ai" ? <AssistantPanel /> : null}

        {panel === "support" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPanel("ai")}
              className="tile flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <AshMark className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">{fr ? "Aide IA" : "AI Help"}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fr ? "Réponses instantanées sur ASH Glo" : "Instant answers about ASH Glo"}
                </span>
              </span>
            </button>

            <Link to="/support" onClick={() => setOpen(false)} className="tile flex w-full items-center gap-3 p-4 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold-foreground">
                <Headphones className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">
                  {fr ? "Contacter le support" : "Contact support"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fr ? "Nous répondons par e-mail sous 24 h" : "We reply by email within 24 hours"}
                </span>
              </span>
            </Link>

            <a href="mailto:support@ashglogroup.company" className="tile flex w-full items-center gap-3 p-4 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Mail className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">{fr ? "Par e-mail" : "By email"}</span>
                <span className="block truncate text-xs text-muted-foreground">support@ashglogroup.company</span>
              </span>
            </a>

          </div>
        ) : null}

        {panel === "location" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {fr
                ? "Autorisez la localisation pour trouver les prestataires, services et opportunités près de vous."
                : "Allow location to find nearby services, providers and opportunities."}
            </p>
            {location ? (
              <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
                <MapPin className="size-5 shrink-0 text-success" aria-hidden />
                <p className="text-sm font-semibold text-foreground">
                  {fr ? "Position enregistrée" : "Location saved"} · {location.lat.toFixed(2)},{" "}
                  {location.lng.toFixed(2)}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void request()} disabled={busy}>
                <MapPin className="size-4" aria-hidden />
                {location
                  ? fr
                    ? "Mettre à jour"
                    : "Update location"
                  : fr
                    ? "Activer la localisation"
                    : "Enable location"}
              </Button>
              <Button variant="ghost" onClick={() => setPanel(null)}>
                {fr ? "Pas maintenant" : "Not now"}
              </Button>
            </div>
          </div>
        ) : null}

        {panel === "card" || panel === "bank" ? (
          <div className="space-y-4">
            <div className="virtual-card grain relative p-5">
              <span className="hairline-gold absolute right-4 top-4 rounded-full bg-[oklch(0_0_0_/_0.35)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-gold-soft)]">
                {fr ? "Bientôt" : "Coming soon"}
              </span>
              <p className="eyebrow text-[color:oklch(0.98_0.004_285_/_0.6)]">ASH</p>
              <p className="mt-2 font-display text-2xl font-extrabold">
                {panel === "card" ? "ASH Card" : "ASH Bank"}
              </p>
              <p className="mt-6 text-sm opacity-80">
                {panel === "card"
                  ? fr
                    ? "Dépensez vos gains directement, en ligne et en magasin."
                    : "Spend your earnings directly, online and in store."
                  : fr
                    ? "Épargne, transferts et paiements, intégrés à votre réseau ASH."
                    : "Savings, transfers and payments, built into your ASH network."}
              </p>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 shrink-0" aria-hidden />
              {fr
                ? "Cette fonctionnalité n'est pas encore disponible."
                : "This feature is not available yet."}
            </p>
          </div>
        ) : null}
      </OrbPanel>
    </>
  );
}

function OrbPanel({
  open,
  onClose,
  title,
  subtitle,
  tall,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  tall?: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "ash-rise relative flex w-full max-w-md flex-col rounded-t-3xl border border-border bg-card p-5 shadow-[var(--shadow-raised)] sm:rounded-3xl",
          tall ? "h-[76vh] max-h-[560px]" : "max-h-[86vh] overflow-y-auto",
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-4">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-extrabold text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
