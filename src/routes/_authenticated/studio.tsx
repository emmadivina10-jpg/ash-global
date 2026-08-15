import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Coins, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  usePortfolio,
  useProviderBookings,
  useProviderServices,
  useMyProviderProfile,
} from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { startProviderSubscription, verifyProviderSubscription } from "@/lib/subscriptions.functions";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_KEY,
  PORTFOLIO_BUCKET,
  SERVICE_CATEGORIES,
  SUBSCRIPTION_FEE,
  isSubscriptionActive,
  type ServiceCategory,
} from "@/lib/marketplace";
import { formatDate, formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "My studio — Refer" },
      { name: "description", content: "Create your provider studio, list services, upload your work and go live." },
      { property: "og:title", content: "My studio — Refer" },
      { property: "og:description", content: "Manage services, portfolio, bookings and your monthly subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { t } = useI18n();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: studio, isLoading } = useMyProviderProfile();
  const { data: services } = useProviderServices(studio?.id, false);
  const { data: portfolio } = usePortfolio(studio?.id);
  const { data: bookings } = useProviderBookings(studio?.id);

  const startSub = useServerFn(startProviderSubscription);
  const verifySub = useServerFn(verifyProviderSubscription);

  const [form, setForm] = useState({
    business_name: "",
    bio: "",
    city: "",
    phone: "",
    whatsapp: "",
    categories: [] as ServiceCategory[],
  });
  const [saving, setSaving] = useState(false);
  const [busySub, setBusySub] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [service, setService] = useState({ title: "", price: "", duration_minutes: "60", description: "" });

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

  const live = isSubscriptionActive(studio?.subscription_expires_at);

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
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      business_name: form.business_name.trim(),
      bio: form.bio.trim() || null,
      city: form.city.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      categories: form.categories,
    };
    const { error } = studio
      ? await supabase.from("provider_profiles").update(payload).eq("id", studio.id)
      : await supabase.from("provider_profiles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(t("pro.saveErr"));
      return;
    }
    toast.success(t("pro.saved"));
    void queryClient.invalidateQueries({ queryKey: ["provider"] });
    void queryClient.invalidateQueries({ queryKey: ["providers"] });
  }

  async function addService(event: React.FormEvent) {
    event.preventDefault();
    if (!studio) return;
    const price = Number(service.price);
    const duration = Number(service.duration_minutes);
    if (!service.title.trim() || !Number.isFinite(price) || price <= 0) return;
    const { error } = await supabase.from("provider_services").insert({
      provider_id: studio.id,
      title: service.title.trim(),
      price,
      duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : 60,
      description: service.description.trim() || null,
    });
    if (error) {
      toast.error(t("pro.saveErr"));
      return;
    }
    setService({ title: "", price: "", duration_minutes: "60", description: "" });
    void queryClient.invalidateQueries({ queryKey: ["provider-services", studio.id] });
  }

  async function removeService(id: string) {
    await supabase.from("provider_services").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["provider-services", studio?.id] });
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || !studio || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) throw new Error("too-large");
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase
          .from("portfolio_items")
          .insert({ provider_id: studio.id, storage_path: path });
        if (rowErr) throw rowErr;
      }
      void queryClient.invalidateQueries({ queryKey: ["portfolio", studio.id] });
    } catch {
      toast.error(t("pro.uploadErr"));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(id: string, path: string) {
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
    await supabase.from("portfolio_items").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["portfolio", studio?.id] });
  }

  async function paySubscription() {
    setBusySub(true);
    try {
      const result = await startSub({ data: {} });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      toast.error(t("pro.subErr"));
    } catch {
      toast.error(t("pro.subErr"));
    } finally {
      setBusySub(false);
    }
  }

  async function checkSubscription() {
    setBusySub(true);
    try {
      const result = await verifySub({ data: {} });
      if (result?.active) {
        toast.success(t("pro.subVerified"));
        void queryClient.invalidateQueries({ queryKey: ["provider"] });
      } else {
        toast.message(t("pro.subPending"));
      }
    } catch {
      toast.error(t("pro.subErr"));
    } finally {
      setBusySub(false);
    }
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

      <SectionCard title={studio ? t("pro.title") : t("pro.create")}>
        {!studio ? (
          <p className="mb-4 text-sm text-muted-foreground">
            {t("pro.createCopy", { fee: formatXAF(SUBSCRIPTION_FEE) })}
          </p>
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
                    {t(CATEGORY_KEY[c])}
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
          <SectionCard title={t("pro.subTitle")}>
            <p className="text-sm text-muted-foreground">{t("pro.subCopy", { fee: formatXAF(SUBSCRIPTION_FEE) })}</p>
            {live ? (
              <p className="mt-2 text-sm font-semibold text-primary">
                {t("pro.subActive", { date: formatDate(studio.subscription_expires_at) })}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={paySubscription} disabled={busySub}>
                {busySub ? t("pro.subStarting") : t("pro.subPay", { fee: formatXAF(SUBSCRIPTION_FEE) })}
              </Button>
              <Button variant="outline" onClick={checkSubscription} disabled={busySub}>
                {t("pro.subVerify")}
              </Button>
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
              <Input
                className="sm:col-span-3"
                placeholder={t("pro.description")}
                value={service.description}
                onChange={(e) => setService({ ...service, description: e.target.value })}
              />
              <Button type="submit">{t("pro.addService")}</Button>
            </form>

            <ul className="mt-4 divide-y divide-border">
              {(services ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
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
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => uploadPhotos(e.target.files)}
              />
              {uploading ? t("pro.uploading") : t("pro.upload")}
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(portfolio ?? []).map((item) =>
                item.url ? (
                  <figure key={item.id} className="relative overflow-hidden rounded-2xl border border-border">
                    <img src={item.url} alt={item.caption ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-1.5 top-1.5 size-7"
                      aria-label={t("pro.delete")}
                      onClick={() => removePhoto(item.id, item.storage_path)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </figure>
                ) : null,
              )}
            </div>
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
    </div>
  );
}
