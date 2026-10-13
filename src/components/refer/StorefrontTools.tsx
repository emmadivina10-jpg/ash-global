import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Copy, ExternalLink, Link2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/refer/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

type Studio = {
  id: string;
  business_name: string;
  slug: string | null;
  tagline: string | null;
  is_verified: boolean;
  verification_status: string;
  slot_minutes: number;
  booking_lead_hours: number;
  accepting_bookings: boolean;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function origin(): string {
  return typeof window === "undefined" ? "https://ashglogroup.company" : window.location.origin;
}

async function copy(text: string, message = "Link copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Could not copy the link");
  }
}

/* ------------------------------------------------------------------ */
/* Storefront link + ASH verification                                  */
/* ------------------------------------------------------------------ */

export function StorefrontCard({ studio }: { studio: Studio }) {
  const queryClient = useQueryClient();
  const [tagline, setTagline] = useState(studio.tagline ?? "");
  const [saving, setSaving] = useState(false);
  const url = `${origin()}/s/${studio.slug ?? ""}`;

  useEffect(() => setTagline(studio.tagline ?? ""), [studio.id, studio.tagline]);

  async function saveTagline() {
    setSaving(true);
    const { error } = await supabase
      .from("provider_profiles")
      .update({ tagline: tagline.trim() || null })
      .eq("id", studio.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Storefront updated");
    void queryClient.invalidateQueries({ queryKey: ["provider"] });
  }

  async function requestVerification() {
    const { error } = await supabase
      .from("provider_profiles")
      .update({ verification_status: "PENDING" })
      .eq("id", studio.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verification requested — ASH will review your storefront");
    void queryClient.invalidateQueries({ queryKey: ["provider"] });
  }

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `${studio.business_name} on ASH Glo — see my prices, photos and book me here: ${url}`,
  )}`;

  return (
    <SectionCard title="My storefront link">
      <p className="text-sm text-muted-foreground">
        Share this one link on WhatsApp, status or Facebook. Customers see your catalog, prices,
        ratings and can book instantly.
      </p>

      <div className="mt-3 grid gap-2 rounded-2xl border border-border bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <p className="truncate font-mono text-sm text-foreground">{url}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void copy(url)}>
            <Copy className="size-4" aria-hidden />
            Copy
          </Button>
          <Button size="sm" asChild>
            <a href={whatsappShare} target="_blank" rel="noreferrer">
              Share on WhatsApp
            </a>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={url} target="_blank" rel="noreferrer" aria-label="Preview storefront">
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="tagline">Storefront tagline</Label>
        <Textarea
          id="tagline"
          rows={2}
          maxLength={140}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Knotless braids & wig installs in Buea — home service available"
        />
        <Button size="sm" onClick={() => void saveTagline()} disabled={saving}>
          Save tagline
        </Button>
      </div>

      <div className="mt-5 rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-foreground">ASH verification badge</p>
              <p className="text-xs text-muted-foreground">
                Verified storefronts get the blue badge and rank higher in discovery.
              </p>
            </div>
          </div>
          {studio.is_verified ? (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <BadgeCheck className="size-4" aria-hidden />
              Verified
            </span>
          ) : studio.verification_status === "PENDING" ? (
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-foreground">
              Under review
            </span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void requestVerification()}>
              {studio.verification_status === "REJECTED" ? "Request again" : "Request verification"}
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Booking availability & slots                                        */
/* ------------------------------------------------------------------ */

type DayState = { enabled: boolean; start: string; end: string };

export function AvailabilityCard({ studio }: { studio: Studio }) {
  const queryClient = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["availability", studio.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", studio.id)
        .order("weekday");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [days, setDays] = useState<DayState[]>(
    WEEKDAYS.map(() => ({ enabled: false, start: "09:00", end: "17:00" })),
  );
  const [slotMinutes, setSlotMinutes] = useState(String(studio.slot_minutes ?? 30));
  const [lead, setLead] = useState(String(studio.booking_lead_hours ?? 2));
  const [accepting, setAccepting] = useState(studio.accepting_bookings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rows) return;
    setDays(
      WEEKDAYS.map((_, weekday) => {
        const row = rows.find((r) => r.weekday === weekday);
        return row
          ? {
              enabled: true,
              start: minutesToTime(row.start_minute),
              end: minutesToTime(row.end_minute),
            }
          : { enabled: false, start: "09:00", end: "17:00" };
      }),
    );
  }, [rows]);

  async function save() {
    setSaving(true);
    const payload = days
      .map((d, weekday) => ({ ...d, weekday }))
      .filter((d) => d.enabled && timeToMinutes(d.end) > timeToMinutes(d.start))
      .map((d) => ({
        provider_id: studio.id,
        weekday: d.weekday,
        start_minute: timeToMinutes(d.start),
        end_minute: timeToMinutes(d.end),
      }));

    const { error: delError } = await supabase
      .from("provider_availability")
      .delete()
      .eq("provider_id", studio.id);
    if (delError) {
      setSaving(false);
      toast.error(delError.message);
      return;
    }
    if (payload.length > 0) {
      const { error } = await supabase.from("provider_availability").insert(payload);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }
    const { error: profileError } = await supabase
      .from("provider_profiles")
      .update({
        slot_minutes: Number(slotMinutes) || 30,
        booking_lead_hours: Number(lead) || 0,
        accepting_bookings: accepting,
        is_live: true,
      })
      .eq("id", studio.id);
    setSaving(false);
    if (profileError) {
      toast.error(profileError.message);
      return;
    }
    toast.success("Availability saved — storefront published");
    await queryClient.invalidateQueries({ queryKey: ["availability", studio.id] });
    void queryClient.invalidateQueries({ queryKey: ["provider"] });
  }

  return (
    <SectionCard title="Booking hours & slots">
      <p className="text-sm text-muted-foreground">
        Customers can only pick times inside these hours. Booked slots disappear automatically.
      </p>

      <div className="mt-4 space-y-2">
        {days.map((day, index) => (
          <div
            key={WEEKDAYS[index]}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border px-3 py-2 sm:grid-cols-[8rem_auto_auto]"
          >
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={day.enabled}
                onChange={(e) =>
                  setDays((prev) =>
                    prev.map((d, i) => (i === index ? { ...d, enabled: e.target.checked } : d)),
                  )
                }
              />
              {WEEKDAYS[index]}
            </label>
            <div className={cn("flex items-center gap-2", !day.enabled && "opacity-40")}>
              <Input
                type="time"
                className="h-9 w-[7.5rem]"
                value={day.start}
                disabled={!day.enabled}
                onChange={(e) =>
                  setDays((prev) =>
                    prev.map((d, i) => (i === index ? { ...d, start: e.target.value } : d)),
                  )
                }
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="time"
                className="h-9 w-[7.5rem]"
                value={day.end}
                disabled={!day.enabled}
                onChange={(e) =>
                  setDays((prev) =>
                    prev.map((d, i) => (i === index ? { ...d, end: e.target.value } : d)),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="slotmin">Slot length (min)</Label>
          <select
            id="slotmin"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(e.target.value)}
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead">Notice needed (hours)</Label>
          <Input
            id="lead"
            type="number"
            min={0}
            max={168}
            value={lead}
            onChange={(e) => setLead(e.target.value)}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={accepting}
            onChange={(e) => setAccepting(e.target.checked)}
          />
          Accepting bookings
        </label>
      </div>

      <Button className="mt-4" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save availability"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        These exact days and times are what customers see when they request a booking.
      </p>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Payment links                                                       */
/* ------------------------------------------------------------------ */

export function PaymentLinksCard({
  studio,
  services,
}: {
  studio: Studio;
  services: { id: string; title: string; price: number }[];
}) {
  const queryClient = useQueryClient();
  const { data: links } = useQuery({
    queryKey: ["payment-links", studio.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("provider_id", studio.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ title: "", amount: "", description: "", serviceId: "" });
  const [creating, setCreating] = useState(false);

  const totalCollected = useMemo(
    () => (links ?? []).reduce((sum, l) => sum + l.amount * l.paid_count, 0),
    [links],
  );

  function makeCode(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toLowerCase();
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("payment_links")
      .insert({
        provider_id: studio.id,
        code: makeCode(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        amount: Math.round(amount),
        ...(form.serviceId ? { service_id: form.serviceId } : {}),
      })
      .select("code")
      .maybeSingle();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", amount: "", description: "", serviceId: "" });
    toast.success("Payment link created");
    await queryClient.invalidateQueries({ queryKey: ["payment-links", studio.id] });
    if (data?.code) void copy(`${origin()}/pay/${data.code}`, "Payment link copied");
  }

  async function toggle(id: string, isActive: boolean) {
    await supabase.from("payment_links").update({ is_active: !isActive }).eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["payment-links", studio.id] });
  }

  async function remove(id: string) {
    await supabase.from("payment_links").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["payment-links", studio.id] });
  }

  return (
    <SectionCard title="Payment links">
      <p className="text-sm text-muted-foreground">
        Generate a link for any amount and send it on WhatsApp. The customer pays with Mobile Money;
        ASH keeps 1%.
      </p>

      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-4">
        <Input
          className="sm:col-span-2"
          placeholder="What is this for? (e.g. Knotless braids deposit)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={80}
        />
        <Input
          type="number"
          min={100}
          placeholder="Amount (XAF)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <select
          aria-label="Linked service"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
          value={form.serviceId}
          onChange={(e) => {
            const svc = services.find((s) => s.id === e.target.value);
            setForm((prev) => ({
              ...prev,
              serviceId: e.target.value,
              title: prev.title || (svc?.title ?? ""),
              amount: prev.amount || (svc ? String(svc.price) : ""),
            }));
          }}
        >
          <option value="">No linked service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Input
          className="sm:col-span-3"
          placeholder="Note for the customer (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={160}
        />
        <Button type="submit" disabled={creating}>
          <Plus className="size-4" aria-hidden />
          Create link
        </Button>
      </form>

      {totalCollected > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Collected through links:{" "}
          <span className="font-bold text-foreground">{formatXAF(totalCollected)}</span>
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {(links ?? []).map((link) => {
          const url = `${origin()}/pay/${link.code}`;
          return (
            <li key={link.id} className="rounded-2xl border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{link.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatXAF(link.amount)} · {link.paid_count} paid ·{" "}
                    {link.is_active ? "Active" : "Disabled"}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{url}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copy(url, "Payment link copied")}
                  >
                    <Link2 className="size-4" aria-hidden />
                  </Button>
                  <Button size="sm" asChild>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${link.title} — ${formatXAF(link.amount)}. Pay securely here: ${url}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Send
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggle(link.id, link.is_active)}
                  >
                    {link.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Delete link"
                    onClick={() => void remove(link.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
