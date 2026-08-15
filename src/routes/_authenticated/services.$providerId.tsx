import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  openConversation,
  usePortfolio,
  useProvider,
  useProviderReviews,
  useProviderServices,
} from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { RatingStars } from "@/components/refer/RatingStars";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORY_KEY, type ServiceCategory } from "@/lib/marketplace";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/services/$providerId")({
  head: () => ({
    meta: [
      { title: "Provider profile — Refer" },
      { name: "description", content: "See a provider's work, services and reviews, then book or chat with them." },
      { property: "og:title", content: "Provider profile — Refer" },
      { property: "og:description", content: "Portfolio, services, reviews and instant booking on Refer." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProviderPage,
});

function ProviderPage() {
  const { providerId } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: provider, isLoading } = useProvider(providerId);
  const { data: services } = useProviderServices(providerId);
  const { data: portfolio } = usePortfolio(providerId);
  const { data: reviews } = useProviderReviews(providerId);

  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string>("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading) return <SkeletonRows rows={4} />;
  if (!provider) return <EmptyState title={t("svc.notFound")} />;

  async function startChat() {
    const id = await openConversation(providerId);
    if (id) void navigate({ to: "/messages", search: { c: id } });
  }

  async function book(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const service = (services ?? []).find((s) => s.id === serviceId) ?? (services ?? [])[0];
    if (!service) return;
    const scheduled = new Date(when);
    if (!when || Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
      toast.error(t("book.errDate"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("bookings").insert({
      client_id: user.id,
      provider_id: providerId,
      service_id: service.id,
      service_title: service.title,
      price: service.price,
      scheduled_at: scheduled.toISOString(),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(t("book.err"));
      return;
    }
    toast.success(t("book.sent"));
    setOpen(false);
    setNotes("");
    setWhen("");
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }

  const minPrice = (services ?? []).reduce<number | null>(
    (min, s) => (min === null || s.price < min ? s.price : min),
    null,
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="tile p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 font-display text-2xl font-bold text-primary">
            {provider.business_name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{provider.business_name}</h1>
            {provider.city ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                {provider.city}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <RatingStars value={Number(provider.rating_avg)} />
              <span className="text-xs text-muted-foreground">
                {provider.rating_count > 0 ? t("svc.reviews", { count: provider.rating_count }) : t("svc.noRating")}
              </span>
              {minPrice !== null ? (
                <span className="tabular text-xs font-semibold text-foreground">
                  · {t("svc.from", { price: formatXAF(minPrice) })}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(provider.categories ?? []).map((c: ServiceCategory) => (
                <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {t(CATEGORY_KEY[c] ?? "cat.OTHER")}
                </span>
              ))}
            </div>
          </div>
        </div>

        {provider.bio ? <p className="mt-4 text-sm text-muted-foreground">{provider.bio}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={(services ?? []).length === 0}>{t("svc.book")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("book.title", { name: provider.business_name })}</DialogTitle>
              </DialogHeader>
              <form onSubmit={book} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="service">{t("book.service")}</Label>
                  <select
                    id="service"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {(services ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {formatXAF(s.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="when">{t("book.when")}</Label>
                  <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">{t("book.notes")}</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {t("book.confirm")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={startChat}>
            <MessageCircle className="size-4" aria-hidden />
            {t("svc.chat")}
          </Button>
        </div>
      </header>

      <SectionCard title={t("svc.services")}>
        {(services ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("svc.noServices")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {(services ?? []).map((s) => (
              <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.title}</p>
                  {s.description ? <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p> : null}
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    {t("svc.duration", { minutes: s.duration_minutes })}
                  </p>
                </div>
                <p className="tabular self-center text-sm font-semibold text-foreground">{formatXAF(s.price)}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("svc.portfolio")}>
        {(portfolio ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("svc.noPortfolio")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(portfolio ?? []).map((item) =>
              item.url ? (
                <figure key={item.id} className="overflow-hidden rounded-2xl border border-border">
                  <img
                    src={item.url}
                    alt={item.caption ?? provider.business_name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {item.caption ? (
                    <figcaption className="truncate px-2 py-1.5 text-xs text-muted-foreground">{item.caption}</figcaption>
                  ) : null}
                </figure>
              ) : null,
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("svc.reviewsTitle")}>
        {(reviews ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("svc.noReviews")}</p>
        ) : (
          <ul className="space-y-3">
            {(reviews ?? []).map((r) => (
              <li key={r.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <RatingStars value={r.rating} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                </div>
                {r.comment ? <p className="mt-2 text-sm text-foreground">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
