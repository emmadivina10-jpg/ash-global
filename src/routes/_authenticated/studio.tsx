import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, CalendarClock, Coins, PartyPopper, Star, Trash2, Wallet , Play } from "lucide-react";
import { MediaLightbox, isVideoSource, type LightboxMedia } from "@/components/refer/MediaLightbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "@/lib/media-safety";
import {
  usePortfolio,
  useProviderBookings,
  useProviderServices,
  useMyProviderProfile,
} from "@/lib/marketplace.queries";
import { useUser, useWallet } from "@/lib/queries";

import { SectionCard, StatCard } from "@/components/refer/cards";
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PORTFOLIO_BUCKET, SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/marketplace";
import { formatDateTime, formatXAF } from "@/lib/format";
import { categoryLabel } from "@/lib/taxonomy";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { AvailabilityCard, PaymentLinksCard, StorefrontCard } from "@/components/refer/StorefrontTools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "My studio — ASH Glo" },
      { name: "description", content: "Create your provider studio, list services, upload your work and go live." },
      { property: "og:title", content: "My studio — ASH Glo" },
      { property: "og:description", content: "Manage services, portfolio, bookings and your monthly subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { t, lang } = useI18n();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: studio, isLoading } = useMyProviderProfile();
  const { data: services } = useProviderServices(studio?.id, false);
  const { data: portfolio } = usePortfolio(studio?.id);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const { data: bookings } = useProviderBookings(studio?.id);
  const { data: wallet } = useWallet();
  const pendingPayments = (bookings ?? []).filter((b) =>
    ["ACCEPTED", "PAYMENT_PROCESSING", "PAYMENT_FAILED"].includes(String(b.status)),
  );
  const earnedNet = (bookings ?? [])
    .filter((b) => ["COMPLETED", "SETTLED"].includes(String(b.status)))
    .reduce((sum, b) => sum + Number(b.provider_amount ?? b.price - Math.round(Number(b.price) * 0.01)), 0);


  const [form, setForm] = useState({
    business_name: "",
    bio: "",
    city: "",
    phone: "",
    whatsapp: "",
    categories: [] as ServiceCategory[],
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ code: string | null; message: string } | null>(null);
  const [celebrate, setCelebrate] = useState<"created" | "updated" | "service" | null>(null);
  const navigate = useNavigate();
  const region = useRegion();
  const [uploading, setUploading] = useState(false);
  const [service, setService] = useState({
    title: "",
    price: "",
    duration_minutes: "60",
    description: "",
    category: "" as ServiceCategory | "",
  });
  const [addingService, setAddingService] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (!studio) return;
    setForm({
      business_name: studio.business_name ?? "",
      bio: studio.bio ?? "",
      city: studio.city ?? "",
      phone: studio.phone ?? "",
      whatsapp: studio.whatsapp ?? "",
      categories: (studio.categories ?? []) as ServiceCategory[],
    });
  }, [studio?.id]);

  // After saving the profile, confirm briefly then take the user to the marketplace.
  useEffect(() => {
    if (celebrate !== "created" && celebrate !== "updated") return;
    const timer = setTimeout(() => {
      setCelebrate(null);
      void navigate({ to: "/services" });
    }, 2200);
    return () => clearTimeout(timer);
  }, [celebrate, navigate]);

  // The marketplace is free: a studio goes live as soon as its profile is saved.
  const live = Boolean(studio?.is_live);


  const stats = useMemo(() => {
    const list = bookings ?? [];
    const completed = list.filter((b) => b.status === "COMPLETED");
    return {
      total: list.length,
      upcoming: list.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING").length,
      revenue: completed.reduce((sum, b) => sum + Number(b.price), 0),
    };
  }, [bookings]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      // Resolve the owner id from the live session so brand-new accounts work too.
      let ownerId = user?.id ?? null;
      if (!ownerId) {
        const { data: auth } = await supabase.auth.getUser();
        ownerId = auth.user?.id ?? null;
      }
      if (!ownerId) {
        setSaveError({ code: "AUTH_REQUIRED", message: t("pro.saveErr") });
        return;
      }
      if (!form.business_name.trim()) {
        setSaveError({ code: "VALIDATION_ERROR", message: t("pro.saveErr") });
        return;
      }
      const payload = {
        user_id: ownerId,
        business_name: form.business_name.trim(),
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        categories: form.categories,
        country: region.seesEverything ? region.detected : region.country,
      };
      const isNew = !studio;
      // Upsert on user_id: creates the studio the first time, updates it afterwards.
      const { data: saved, error } = await supabase
        .from("provider_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select("id")
        .maybeSingle();
      if (error || !saved?.id) {
        setSaveError({
          code: error?.code ?? (saved?.id ? null : "NO_ROW_RETURNED"),
          message: error?.message ?? t("pro.saveErr"),
        });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["provider"] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      await queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success(isNew ? "Studio created — you're live!" : "Storefront updated");
      setCelebrate(isNew ? "created" : "updated");
    } catch (err) {
      setSaveError({
        code: "CLIENT_EXCEPTION",
        message: err instanceof Error ? err.message : t("pro.saveErr"),
      });
    } finally {
      setSaving(false);
    }
  }

  async function publishStorefront() {
    if (!studio?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("provider_profiles")
      .update({ is_live: true })
      .eq("id", studio.id);
    setSaving(false);
    if (error) {
      toast.error(lang === "fr" ? "Publication impossible." : "Could not publish your storefront.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["provider"] });
    await queryClient.invalidateQueries({ queryKey: ["providers"] });
    await queryClient.invalidateQueries({ queryKey: ["discovery"] });
    toast.success(lang === "fr" ? "Votre vitrine est publiée." : "Your storefront is published.");
    setCelebrate("created");
  }



  async function addService(event: React.FormEvent) {
    event.preventDefault();
    if (!studio) return;
    const price = Number(service.price);
    const duration = Number(service.duration_minutes);
    if (!service.title.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(t("pro.saveErr"));
      return;
    }
    setAddingService(true);
    const { data: inserted, error } = await supabase
      .from("provider_services")
      .insert({
        provider_id: studio.id,
        title: service.title.trim(),
        price,
        duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : 60,
        description: service.description.trim() || null,
        ...(service.category ? { category: service.category as ServiceCategory } : {}),
      })
      .select("id")
      .maybeSingle();
    setAddingService(false);
    if (error || !inserted?.id) {
      toast.error(error?.message || t("pro.saveErr"));
      return;
    }
    setService({ title: "", price: "", duration_minutes: "60", description: "", category: "" });
    toast.success(t("pro.serviceAdded"));
    await queryClient.invalidateQueries({ queryKey: ["provider-services"] });
    await queryClient.invalidateQueries({ queryKey: ["providers"] });
    setHighlightId(inserted.id);
    setTimeout(() => setHighlightId((id) => (id === inserted.id ? null : id)), 2500);
    // The service is saved: confirm it and offer to leave the studio for the marketplace.
    setCelebrate("service");
  }



  async function removeService(id: string) {
    await supabase.from("provider_services").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["provider-services", studio?.id] });
  }

  async function uploadPhotos(files: FileList | null, input?: HTMLInputElement | null) {
    if (!files || files.length === 0) return;
    if (!user) {
      toast.error(t("pro.uploadErr"));
      return;
    }
    if (!studio) {
      toast.error(t("pro.activatePrompt"));
      return;
    }
    setUploading(true);
    let uploaded = 0;
    try {
      await verifyMediaFiles(Array.from(files), "PROVIDER_PORTFOLIO");
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        if (!file.type.startsWith("image/") && !isVideo) {
          toast.error(`${file.name}: images or videos only`);
          continue;
        }
        const maxBytes = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxBytes) {
          toast.error(`${file.name}: max ${isVideo ? "50MB" : "5MB"}`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.-]/g, "_");
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(PORTFOLIO_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { error: rowErr } = await supabase
          .from("portfolio_items")
          .insert({ provider_id: studio.id, image_path: path });
        if (rowErr) {
          // Don't leave an orphan object behind if the row could not be saved.
          await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
          toast.error(`${file.name}: ${rowErr.message}`);
          continue;
        }
        uploaded += 1;
      }
      if (uploaded > 0) {
        toast.success(`${uploaded} ${uploaded === 1 ? "file" : "files"} uploaded`);
        await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("pro.uploadErr"));
    } finally {
      setUploading(false);
      if (input) input.value = "";
    }
  }


  async function removePhoto(id: string, path: string) {
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
    await supabase.from("portfolio_items").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["portfolio", studio?.id] });
  }


  if (isLoading) return <SkeletonRows rows={4} />;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("pro.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pro.subtitle")}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            live ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {live ? t("pro.live") : t("pro.offline")}
        </span>
      </header>

      {studio ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("pro.stat.bookings")} value={String(stats.total)} icon={<CalendarClock className="size-4" />} />
          <StatCard label={t("pro.stat.upcoming")} value={String(stats.upcoming)} icon={<CalendarClock className="size-4" />} />
          <StatCard label={t("pro.stat.revenue")} value={formatXAF(stats.revenue)} icon={<Coins className="size-4" />} />
        </div>
      ) : null}

      {studio ? (
        <SectionCard title={lang === "fr" ? "Revenus et paiement" : "Earnings & payout"}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">{lang === "fr" ? "Disponible au retrait" : "Available to withdraw"}</p>
              <p className="mt-1 font-display text-lg font-bold text-primary">
                {formatXAF(Number(wallet?.available_balance ?? 0))}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{lang === "fr" ? "Paiements en attente" : "Pending payments"}</p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">
                {pendingPayments.length} {lang === "fr" ? "réservation(s)" : "booking(s)"}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">{lang === "fr" ? "Gains nets (après 1%)" : "Net earnings (after 1% fee)"}</p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">{formatXAF(earnedNet)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === "fr"
              ? "ASH Glo retient 1% de commission par réservation. Vos gains arrivent dans votre portefeuille une fois la prestation terminée."
              : "ASH Glo keeps a 1% commission per booking. Your earnings land in your wallet once the job is completed."}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => void navigate({ to: "/wallet" })}>
            <Wallet className="size-4" />
            {lang === "fr" ? "Ouvrir mon portefeuille" : "Open my wallet"}
            <ArrowRight className="size-4" />
          </Button>
        </SectionCard>
      ) : null}

      <SectionCard title={studio ? t("pro.title") : t("pro.create")}>
        {!studio ? <p className="mb-4 text-sm text-muted-foreground">{t("pro.createCopyFree")}</p> : null}
        {saveError ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Studio could not be saved</p>
              <p className="mt-0.5 break-words">
                {saveError.code ? `${saveError.code}: ` : ""}{saveError.message}
              </p>
            </div>
          </div>
        ) : null}
        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="business_name">{t("pro.businessName")}</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{t("pro.city")}</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("pro.phone")}</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">{t("pro.whatsapp")}</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">{t("pro.bio")}</Label>
            <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("pro.categories")}</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CATEGORIES.map((c) => {
                const selected = form.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        categories: selected ? form.categories.filter((x) => x !== c) : [...form.categories, c],
                      })
                    }
                    className={cn(
                      "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                      selected ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {categoryLabel(c, lang)}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" disabled={saving} className="sm:col-span-2">
            {t("pro.save")}
          </Button>
        </form>
      </SectionCard>

      {studio ? (
        <>
          <StorefrontCard studio={studio as never} />
          <AvailabilityCard studio={studio as never} />
          <PaymentLinksCard
            studio={studio as never}
            services={(services ?? []).map((s) => ({ id: s.id, title: s.title, price: s.price }))}
          />

          <SectionCard title={t("pro.billing.title")}>
            {!live ? (
              <p className="mb-4 rounded-2xl bg-gold/10 px-3.5 py-2.5 text-sm font-medium text-foreground">
                {t("pro.activatePrompt")}
              </p>
            ) : null}
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <p className="font-display text-lg font-bold text-foreground">{t("pro.billing.freeTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pro.billing.freeCopy")}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                <li>• {t("pro.billing.freePoint1")}</li>
                <li>• {t("pro.billing.freePoint2")}</li>
                <li>• {t("pro.billing.freePoint3")}</li>
              </ul>
            </div>
          </SectionCard>


          <SectionCard title={t("svc.services")}>
            <form onSubmit={addService} className="grid gap-3 sm:grid-cols-4">
              <Input
                className="sm:col-span-2"
                placeholder={t("pro.serviceTitle")}
                value={service.title}
                onChange={(e) => setService({ ...service, title: e.target.value })}
                required
              />
              <Input
                type="number"
                min={1}
                placeholder={t("pro.price")}
                value={service.price}
                onChange={(e) => setService({ ...service, price: e.target.value })}
                required
              />
              <Input
                type="number"
                min={5}
                step={5}
                placeholder={t("pro.durationMin")}
                value={service.duration_minutes}
                onChange={(e) => setService({ ...service, duration_minutes: e.target.value })}
              />
              <select
                aria-label={t("pro.categories")}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                value={service.category}
                onChange={(e) => setService({ ...service, category: e.target.value as ServiceCategory })}
              >
                <option value="">{t("pro.categories")}</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c, lang)}
                  </option>
                ))}
              </select>
              <Input
                className="sm:col-span-2"
                placeholder={t("pro.description")}
                value={service.description}
                onChange={(e) => setService({ ...service, description: e.target.value })}
              />
              <Button type="submit" disabled={addingService}>
                {addingService ? t("pro.uploading") : t("pro.addService")}
              </Button>
            </form>

            <ul className="mt-4 divide-y divide-border">
              {(services ?? []).map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors",
                    highlightId === s.id && "bg-primary/10",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatXAF(s.price)} · {t("svc.duration", { minutes: s.duration_minutes })}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={t("pro.delete")} onClick={() => removeService(s.id)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>

          </SectionCard>

          <SectionCard title={t("svc.portfolio")}>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={(e) => uploadPhotos(e.target.files, e.currentTarget)}
              />
              {uploading ? t("pro.uploading") : t("pro.upload")}
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(portfolio ?? []).map((item) =>
                item.url ? (
                  <figure key={item.id} className="relative overflow-hidden rounded-2xl border border-border">
                    {isVideoSource(item.image_path) ? (
                      <button
                        type="button"
                        className="relative block w-full"
                        aria-label="Play video"
                        onClick={() => setLightbox({ url: item.url!, caption: item.caption, isVideo: true })}
                      >
                        <video src={item.url} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                        <span className="absolute inset-0 grid place-items-center bg-black/30">
                          <span className="grid size-9 place-items-center rounded-full bg-white/90 text-black">
                            <Play className="size-4 fill-current" aria-hidden />
                          </span>
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="block w-full"
                        aria-label="View photo"
                        onClick={() => setLightbox({ url: item.url!, caption: item.caption, isVideo: false })}
                      >
                        <img src={item.url} alt={item.caption ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
                      </button>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-1.5 top-1.5 size-7"
                      aria-label={t("pro.delete")}
                      onClick={() => removePhoto(item.id, item.image_path)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </figure>
                ) : null,
              )}
            </div>
            <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />
          </SectionCard>

          {/* Wrap-up: one clear finishing action once everything is entered. */}
          <SectionCard title={lang === "fr" ? "Terminer" : "Finish up"}>
            <p className="text-sm text-muted-foreground">
              {lang === "fr"
                ? "Quand vos services, vos horaires et vos photos sont prêts, terminez ici. Votre vitrine devient visible et réservable."
                : "When your services, hours and photos are ready, finish here. Your storefront becomes visible and bookable."}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-foreground">
              <li>
                {(services ?? []).length > 0 ? "✓" : "•"}{" "}
                {lang === "fr" ? "Services" : "Services"}: {(services ?? []).length}
              </li>
              <li>
                {(portfolio ?? []).length > 0 ? "✓" : "•"}{" "}
                {lang === "fr" ? "Photos & vidéos" : "Photos & videos"}: {(portfolio ?? []).length}
              </li>
            </ul>
            <Button
              className="mt-4 h-12 w-full sm:w-auto"
              disabled={(services ?? []).length === 0 || saving}
              onClick={() => void publishStorefront()}
            >
              {lang === "fr" ? "J'ai terminé — publier ma vitrine" : "I'm done — publish my storefront"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            {(services ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {lang === "fr" ? "Ajoutez au moins un service d'abord." : "Add at least one service first."}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title={t("book.received")}>
            <ul className="divide-y divide-border">
              {(bookings ?? []).slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{b.service_title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(b.scheduled_at)}</p>
                  </div>
                  <span className="tabular text-sm font-semibold">{formatXAF(b.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-gold text-gold" aria-hidden />
              {t("pro.stat.rating")}: {Number(studio.rating_avg).toFixed(1)} ({studio.rating_count})
            </p>
          </SectionCard>
        </>
      ) : null}

      {celebrate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-raised">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-gold text-on-dark">
              <PartyPopper className="size-6" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-extrabold text-foreground">
              {celebrate === "created"
                ? "Congratulations, you're live!"
                : celebrate === "service"
                  ? "Service published!"
                  : "Storefront updated!"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {celebrate === "created"
                ? "Your storefront is now on the ASH Glo marketplace. Customers nearby can find, book and pay you."
                : celebrate === "service"
                  ? "Your service is saved and now bookable on the ASH Glo marketplace."
                  : "Your changes are saved and already visible on the marketplace."}
            </p>
            <div className="mt-5 grid gap-2">
              <Button
                onClick={() => {
                  setCelebrate(null);
                  void navigate({ to: "/services" });
                }}
              >
                Go to the marketplace
              </Button>
              <Button variant="ghost" onClick={() => setCelebrate(null)}>
                {celebrate === "service" ? "Add another service" : "Keep editing"}
              </Button>
            </div>
          </div>
        </div>

      ) : null}
    </div>
  );
}
