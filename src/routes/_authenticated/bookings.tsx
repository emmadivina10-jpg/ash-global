import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock, CreditCard, Landmark, MapPin, MessageCircle, RefreshCw, Smartphone, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  openConversation,
  useMyBookings,
  useMyProviderProfile,
  useMyReviews,
  useProviderBookings,
  type ProviderBookingRow,
} from "@/lib/marketplace.queries";
import { startBookingPayment, syncBookingPayment } from "@/lib/booking.functions";
import { startBookingBankPayment, type BankDetails } from "@/lib/payments-ledger.functions";
import { BankInstructions, BANK_UNAVAILABLE_TEXT } from "@/components/refer/PaymentMethodPicker";
import { paymentErrorMessage } from "@/lib/payment-errors";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { bookingStatusLabel, bookingStatusTone, formatCountdown, timeLeft } from "@/lib/booking";
import { SectionCard } from "@/components/refer/cards";
import { RatingStars } from "@/components/refer/RatingStars";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — ASH Glo" },
      { name: "description", content: "Track the appointments you booked and the clients booking your studio." },
      { property: "og:title", content: "Bookings — ASH Glo" },
      { property: "og:description", content: "Manage appointments, payments and invoices in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingsPage,
});

function StatusPill({ status }: { status: string }) {
  const { lang } = useI18n();
  const tone = bookingStatusTone(status);
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "positive" && "bg-primary/10 text-primary",
        tone === "warning" && "bg-gold/15 text-gold-foreground",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {bookingStatusLabel(status, lang)}
    </span>
  );
}

/** Live countdown that re-renders every 30 seconds. */
function Countdown({ deadline, label }: { deadline: string | null; label: string }) {
  const { lang } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] font-semibold",
        ms <= 0 ? "text-destructive" : ms < 3_600_000 ? "text-destructive" : "text-muted-foreground",
      )}
    >
      <Clock className="size-3.5" aria-hidden />
      {label} {formatCountdown(ms, lang)}
    </span>
  );
}

function BookingsPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mobileMoneyEnabled, country } = useRegion();
  const { data: mine, isLoading } = useMyBookings();
  const { data: studio } = useMyProviderProfile();
  const { data: received } = useProviderBookings(studio?.id);
  const { data: reviewed } = useMyReviews();

  const startPayment = useServerFn(startBookingPayment);
  const syncPayment = useServerFn(syncBookingPayment);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [momoBooking, setMomoBooking] = useState<{ id: string; price: number } | null>(null);
  const startBank = useServerFn(startBookingBankPayment);
  const [bankInfo, setBankInfo] = useState<{ bank: BankDetails | null; reference: string | null; price: number; error: string | null } | null>(null);
  async function payBank(id: string, price: number) {
    setBusyId(id);
    const r = await startBank({ data: { bookingId: id } });
    setBusyId(null);
    setBankInfo({ bank: r.bank, reference: r.reference, price, error: r.ok ? null : r.error === "BANK_UNAVAILABLE" ? BANK_UNAVAILABLE_TEXT : (r.error ?? "PAYMENT_START_FAILED") });
  }
  const [tab, setTab] = useState<"client" | "provider">("client");

  const clientBookings = (mine ?? []) as Array<Record<string, unknown> & { id: string }>;
  const providerBookings = received ?? [];

  const pendingForProvider = useMemo(
    () => providerBookings.filter((b) => b.status === "PENDING").length,
    [providerBookings],
  );

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }

  // While a mobile money prompt is on the payer's phone, ask the server for the
  // real outcome every few seconds so the booking confirms (or fails) on its own.
  const awaitingIds = useMemo(
    () =>
      clientBookings
        .filter((b) => String(b["status"] ?? "") === "PAYMENT_PROCESSING")
        .map((b) => b.id)
        .join(","),
    [clientBookings],
  );

  useEffect(() => {
    if (!awaitingIds) return;
    let cancelled = false;
    const ids = awaitingIds.split(",");
    async function check() {
      let changed = false;
      for (const id of ids) {
        try {
          const result = await syncPayment({ data: { bookingId: id } });
          if (result.ok && result.status !== "PENDING" && result.status !== "PROCESSING") changed = true;
        } catch {
          /* transient network issue — the next tick retries */
        }
      }
      if (!cancelled && changed) refresh();
    }
    const timer = setInterval(() => void check(), 6000);
    void check();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingIds]);


  async function pay(bookingId: string, method: "MOMO" | "CARD", momo?: { provider: string; phone: string }) {
    setBusyId(bookingId);
    try {
      const result = await startPayment({
        data: { bookingId, method, provider: momo?.provider ?? "", phone: momo?.phone ?? "", country, origin: window.location.origin },
      });
      if (!result.ok) {
        const code = result.error ?? "";
        const message =
          code === "PAYMENT_WINDOW_EXPIRED"
            ? fr
              ? "Le délai de paiement de 24 h est dépassé."
              : "The 24-hour payment window has expired."
            : code === "ALREADY_PAID"
              ? fr
                ? "Cette réservation est déjà payée."
                : "This booking is already paid."
              : code === "STRIPE_NOT_CONFIGURED" || code === "PROVIDER_NOT_CONFIGURED"
                ? fr
                  ? "Ce moyen de paiement n'est pas encore disponible. Essayez l'autre option."
                  : "This payment method isn't available yet. Try the other option."
                : paymentErrorMessage(code, fr, "message" in result ? result.message : null);
        toast.error(message);
        refresh();
        return;
      }
      if ("checkoutUrl" in result && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setMomoBooking(null);
      refresh();
      toast.message(
        fr ? "Validez la demande sur votre téléphone." : "Approve the payment prompt on your phone.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : fr
            ? "Impossible de démarrer le paiement."
            : "Could not start the payment.",
      );
    } finally {
      setBusyId(null);
    }
  }


  async function sync(bookingId: string) {
    setBusyId(bookingId);
    try {
      const result = await syncPayment({ data: { bookingId } });
      refresh();
      if (result.ok && result.status === "PAID") {
        toast.success(fr ? "Paiement confirmé. Réservation confirmée." : "Payment confirmed. Booking confirmed.");
      } else if (result.ok) {
        toast.message(fr ? "Paiement encore en attente." : "Payment still pending.");
      } else {
        toast.error(fr ? "Vérification impossible pour l'instant." : "Could not verify right now.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function chat(providerId: string, bookingId: string) {
    const id = await openConversation(providerId, bookingId);
    if (!id) {
      toast.error(t("book.err"));
      return;
    }
    void navigate({ to: "/messages", search: { c: id } });
  }

  async function decide(bookingId: string, decision: "ACCEPT" | "DECLINE", reason?: string) {
    setBusyId(bookingId);
    const { data, error } = await supabase.rpc("decide_booking", {
      _booking_id: bookingId,
      _accept: decision === "ACCEPT",
      _reason: reason ?? "",
    });
    setBusyId(null);
    const result = data as { ok?: boolean; error?: string } | null;
    if (error || !result?.ok) {
      toast.error(t("book.err"));
      return;
    }
    refresh();
    toast.success(
      decision === "ACCEPT"
        ? fr
          ? "Accepté. Le client a 24 h pour payer."
          : "Accepted. The client has 24 hours to pay."
        : fr
          ? "Demande refusée."
          : "Request declined.",
    );
  }

  async function progress(bookingId: string, next: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW") {
    setBusyId(bookingId);
    const { data, error } = await supabase.rpc("set_booking_progress", {
      _booking_id: bookingId,
      _status: next,
    });
    setBusyId(null);
    const result = data as { ok?: boolean; error?: string } | null;
    if (error || !result?.ok) {
      toast.error(t("book.err"));
      return;
    }
    refresh();
  }

  async function cancel(bookingId: string) {
    const { error } = await supabase.from("bookings").update({ status: "CANCELLED" }).eq("id", bookingId);
    if (error) {
      toast.error(t("book.err"));
      return;
    }
    refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h1 className="truncate font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {fr ? "Réservations" : "Bookings"}
        </h1>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="size-4" aria-hidden />
          <span className="hidden sm:inline">{fr ? "Actualiser" : "Refresh"}</span>
        </Button>
      </header>

      {studio ? (
        <div className="flex gap-2 rounded-2xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("client")}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
              tab === "client" ? "brand-gradient text-on-dark" : "text-muted-foreground",
            )}
          >
            {fr ? "Mes réservations" : "My bookings"}
          </button>
          <button
            type="button"
            onClick={() => setTab("provider")}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
              tab === "provider" ? "brand-gradient text-on-dark" : "text-muted-foreground",
            )}
          >
            {fr ? "Reçues" : "Received"}
            {pendingForProvider > 0 ? (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                {pendingForProvider}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {(!studio || tab === "client") && (
        <SectionCard title={fr ? "Mes réservations" : "My bookings"}>
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : clientBookings.length === 0 ? (
            <EmptyState
              title={t("book.none")}
              description={fr ? "Trouvez un pro dans Découvrir." : "Find a pro in Discover."}
              icon={<CalendarDays className="size-5" aria-hidden />}
            />
          ) : (
            <ul className="space-y-3">
              {clientBookings.map((raw) => {
                const b = raw as unknown as {
                  id: string;
                  provider_id: string;
                  service_title: string;
                  price: number;
                  scheduled_at: string;
                  address: string | null;
                  status: string;
                  pay_by: string | null;
                  respond_by: string | null;
                  decline_reason: string | null;
                  invoice_number: string | null;
                  provider: { business_name: string; city: string | null } | null;
                };
                const payable = ["ACCEPTED", "PAYMENT_FAILED"].includes(b.status);
                const expired = payable && (timeLeft(b.pay_by) ?? 1) <= 0;
                return (
                  <li key={b.id} className="rounded-2xl border border-border p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{b.service_title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.provider?.business_name} · {formatDateTime(b.scheduled_at)}
                        </p>
                        {b.address ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" aria-hidden />
                            {b.address}
                          </p>
                        ) : null}
                        {b.invoice_number ? (
                          <p className="mt-0.5 text-[11px] font-semibold text-primary">{b.invoice_number}</p>
                        ) : null}
                        {b.decline_reason ? (
                          <p className="mt-1 text-xs text-destructive">{b.decline_reason}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="tabular text-sm font-bold">{formatXAF(b.price)}</span>
                        <StatusPill status={b.status} />
                        {b.status === "PENDING" ? (
                          <Countdown deadline={b.respond_by} label={fr ? "réponse dans" : "reply in"} />
                        ) : null}
                        {payable && !expired ? (
                          <Countdown deadline={b.pay_by} label={fr ? "payer sous" : "pay within"} />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {payable && mobileMoneyEnabled ? (
                        <Button
                          size="sm"
                          disabled={busyId === b.id || expired}
                          onClick={() => setMomoBooking({ id: b.id, price: Number(b.price ?? 0) })}
                        >
                          <Smartphone className="size-4" aria-hidden />
                          {fr ? "Payer par Mobile Money" : "Pay with Mobile Money"}
                        </Button>
                      ) : null}
                      {payable ? (
                        <Button
                          size="sm"
                          variant={mobileMoneyEnabled ? "outline" : "default"}
                          disabled={busyId === b.id || expired}
                          onClick={() => void pay(b.id, "CARD")}
                        >
                          <CreditCard className="size-4" aria-hidden />
                          {fr ? "Payer par carte" : "Pay by card"}
                        </Button>
                      ) : null}
                      {payable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === b.id || expired}
                          onClick={() => void payBank(b.id, Number(b.price ?? 0))}
                        >
                          <Landmark className="size-4" aria-hidden />
                          {fr ? "Virement bancaire" : "Bank"}
                        </Button>
                      ) : null}
                      {b.status === "PAYMENT_PROCESSING" ? (
                        <Button size="sm" disabled={busyId === b.id} onClick={() => void sync(b.id)}>
                          <RefreshCw className="size-4" aria-hidden />
                          {fr ? "J'ai payé" : "I have paid"}
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => void chat(b.provider_id, b.id)}>
                        <MessageCircle className="size-4" aria-hidden />
                        {t("svc.chat")}
                      </Button>
                      {["PENDING", "ACCEPTED"].includes(b.status) ? (
                        <Button size="sm" variant="ghost" onClick={() => void cancel(b.id)}>
                          {t("book.cancel")}
                        </Button>
                      ) : null}
                      {["COMPLETED", "SETTLED"].includes(b.status) && !reviewed?.[b.id] ? (
                        <ReviewDialog bookingId={b.id} onDone={refresh} />
                      ) : null}
                      {reviewed?.[b.id] ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RatingStars value={reviewed[b.id]!.rating} size={12} />
                          {fr ? "Avis envoyé" : "Review sent"}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {studio && tab === "provider" ? (
        <SectionCard title={fr ? "Demandes reçues" : "Requests received"}>
          {providerBookings.length === 0 ? (
            <EmptyState title={t("book.none")} icon={<CalendarDays className="size-5" aria-hidden />} />
          ) : (
            <ul className="space-y-3">
              {providerBookings.map((b) => (
                <ProviderBookingItem
                  key={b.id}
                  booking={b}
                  busy={busyId === b.id}
                  onDecide={decide}
                  onProgress={progress}
                  onChat={() => void chat(b.provider_id, b.id)}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <Dialog open={Boolean(bankInfo)} onOpenChange={(open) => !open && setBankInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fr ? "Virement bancaire" : "Bank transfer"}</DialogTitle>
          </DialogHeader>
          {bankInfo?.bank && bankInfo.reference ? (
            <BankInstructions bank={bankInfo.bank} reference={bankInfo.reference} amountLabel={formatXAF(bankInfo.price)} fr={fr} />
          ) : (
            <p className="text-sm">{bankInfo?.error}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(momoBooking)} onOpenChange={(open) => !open && setMomoBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {fr ? "Payer par Mobile Money" : "Pay with Mobile Money"}
              {momoBooking ? ` — ${formatXAF(momoBooking.price)}` : ""}
            </DialogTitle>
          </DialogHeader>
          {momoBooking ? (
            <MomoCharge
              country={country}
              fr={fr}
              busy={busyId === momoBooking.id}
              submitLabel={
                busyId === momoBooking.id
                  ? fr
                    ? "Envoi de la demande…"
                    : "Sending prompt…"
                  : `${fr ? "Payer" : "Pay"} ${formatXAF(momoBooking.price)}`
              }
              onCharge={(provider, phone) => pay(momoBooking.id, "MOMO", { provider, phone })}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProviderBookingItem({
  booking: b,
  busy,
  onDecide,
  onProgress,
  onChat,
}: {
  booking: ProviderBookingRow;
  busy: boolean;
  onDecide: (id: string, decision: "ACCEPT" | "DECLINE", reason?: string) => Promise<void>;
  onProgress: (id: string, next: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW") => Promise<void>;
  onChat: () => void;
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <li className="rounded-2xl border border-border p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{b.service_title}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <User className="size-3.5 shrink-0" aria-hidden />
            {b.client_name} · {formatDateTime(b.scheduled_at)}
          </p>
          {b.address ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {b.address}
            </p>
          ) : null}
          {b.client_phone ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{b.client_phone}</p>
          ) : null}
          {b.notes ? <p className="mt-1 text-xs text-foreground/80">{b.notes}</p> : null}
          {b.invoice_number ? (
            <p className="mt-1 text-[11px] font-semibold text-primary">{b.invoice_number}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="tabular text-sm font-bold">{formatXAF(b.price)}</span>
          {b.provider_amount !== null ? (
            <span className="tabular text-[11px] text-muted-foreground">
              {fr ? "vous recevez" : "you get"} {formatXAF(Number(b.provider_amount))}
            </span>
          ) : null}
          <StatusPill status={b.status} />
          {b.status === "PENDING" ? (
            <Countdown deadline={b.respond_by} label={fr ? "répondre sous" : "respond in"} />
          ) : null}
          {["ACCEPTED", "PAYMENT_PROCESSING"].includes(b.status) ? (
            <Countdown deadline={b.pay_by} label={fr ? "paiement sous" : "payment in"} />
          ) : null}
        </div>
      </div>

      {declining ? (
        <div className="mt-3 space-y-2">
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={fr ? "Raison du refus (visible par le client)" : "Reason for declining (visible to the client)"}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void onDecide(b.id, "DECLINE", reason.trim())}
            >
              {t("book.decline")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>
              {fr ? "Annuler" : "Cancel"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {b.status === "PENDING" ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => void onDecide(b.id, "ACCEPT")}>
                {t("book.accept")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeclining(true)}>
                {t("book.decline")}
              </Button>
            </>
          ) : null}
          {b.status === "CONFIRMED" ? (
            <Button size="sm" disabled={busy} onClick={() => void onProgress(b.id, "IN_PROGRESS")}>
              {fr ? "Démarrer" : "Start"}
            </Button>
          ) : null}
          {b.status === "IN_PROGRESS" ? (
            <Button size="sm" disabled={busy} onClick={() => void onProgress(b.id, "COMPLETED")}>
              {t("book.complete")}
            </Button>
          ) : null}
          {["CONFIRMED", "IN_PROGRESS"].includes(b.status) ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void onProgress(b.id, "NO_SHOW")}>
              {fr ? "Absence client" : "No show"}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onChat}>
            <MessageCircle className="size-4" aria-hidden />
            {t("svc.chat")}
          </Button>
        </div>
      )}
    </li>
  );
}

function ReviewDialog({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const { data, error } = await supabase.rpc("submit_review", {
      _booking_id: bookingId,
      _rating: rating,
      _comment: comment.trim(),
    });
    const result = data as { ok?: boolean } | null;
    if (error || !result?.ok) {
      toast.error(t("book.reviewErr"));
      return;
    }
    toast.success(t("book.reviewSent"));
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t("book.review")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("book.review")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <RatingStars value={rating} size={26} onChange={setRating} />
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("book.comment")}
            rows={3}
          />
          <Button type="submit" className="w-full">
            {t("book.submitReview")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
