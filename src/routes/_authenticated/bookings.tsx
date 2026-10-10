import { useEffect, useMemo, useRef, useState } from "react";
import { CustomerVerificationCode } from "@/components/refer/CustomerVerificationCode";
import { BookingHistoryActions } from "@/components/refer/BookingHistoryActions";
import { useBookingHistory } from "@/lib/booking-history.queries";
import { bookingSearch, canRemoveBookingHistory, historyMatches, type HistoryView } from "@/lib/booking-history";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { verifyBookingService } from "@/lib/stripe-release.functions";
import { startBookingBankPayment, type BankDetails } from "@/lib/payments-ledger.functions";
import { BankInstructions, BANK_UNAVAILABLE_TEXT } from "@/components/refer/PaymentMethodPicker";
import { paymentErrorMessage } from "@/lib/payment-errors";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { bookingStatusLabel, bookingStatusTone, formatCountdown, timeLeft } from "@/lib/booking";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingPaymentNotice, type PaymentCheckFeedback } from "@/components/refer/BookingPaymentNotice";
import { bookingPaymentAction, paymentCheckOutcome } from "@/lib/booking-payment-state";
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
  validateSearch: bookingSearch,
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
      {status === "PAYMENT_PROCESSING" ? (lang === "fr" ? "Confirmation en attente" : "Awaiting confirmation") : bookingStatusLabel(status, lang)}
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
  const search = Route.useSearch();
  const history = useBookingHistory();
  const [historyView, setHistoryView] = useState<HistoryView>("CURRENT");
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
  const checkingPayments = useRef(false);
  const [paymentFeedback, setPaymentFeedback] = useState<Record<string, PaymentCheckFeedback>>({});
  const [paymentBooking, setPaymentBooking] = useState<{ id: string; price: number } | null>(null);
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
  const tab = search.tab;
  useEffect(() => {
    if (!search.booking || tab !== "provider") return;
    const timer = setTimeout(() => {
      const target = document.getElementById(`verify-${search.booking}`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.querySelector("input")?.focus({ preventScroll: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [search.booking, tab, received]);

  const clientBookings = useMemo(() => (mine ?? []) as Array<Record<string, unknown> & { id: string }>, [mine]);
  const providerBookings = useMemo(() => received ?? [], [received]);
  const visibleClients = clientBookings.filter(b => historyMatches(history.data?.[b.id], historyView));
  const visibleProviders = providerBookings.filter(b => historyMatches(history.data?.[b.id], historyView));

  const pendingForProvider = useMemo(
    () => providerBookings.filter((b) => b.status === "PENDING").length,
    [providerBookings],
  );

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }

  // Card and bank confirmation arrive through their authoritative settlement paths.
  // Only mobile money needs a provider check here; never turn a customer claim into payment evidence.
  const awaitingIds = useMemo(
    () =>
      clientBookings
        .filter((b) => String(b["status"] ?? "") === "PAYMENT_PROCESSING" && !["STRIPE", "BANK"].includes(String(b["payment_provider"] ?? "")))
        .map((b) => b.id)
        .join(","),
    [clientBookings],
  );

  useEffect(() => {
    if (!awaitingIds) return;
    let cancelled = false;
    const ids = awaitingIds.split(",");
    async function check() {
      if (cancelled || checkingPayments.current || document.visibilityState === "hidden") return;
      checkingPayments.current = true;
      try {
        let changed = false;
        for (const id of ids) {
          if (cancelled) break;
          try {
            const result = await syncPayment({ data: { bookingId: id } });
            const outcome = paymentCheckOutcome(result);
            if (outcome === "paid" || outcome === "failed") changed = true;
            if (outcome === "unavailable") setPaymentFeedback((prev) => ({ ...prev, [id]: "unavailable" }));
          } catch {
            if (!cancelled) setPaymentFeedback((prev) => ({ ...prev, [id]: "unavailable" }));
          }
        }
        if (!cancelled && changed) refresh();
      } finally {
        checkingPayments.current = false;
      }
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
      const row = clientBookings.find((b) => b.id === bookingId);
      const authoritativeOnly = ["STRIPE", "BANK"].includes(String(row?.["payment_provider"] ?? ""));
      if (authoritativeOnly) {
        await queryClient.invalidateQueries({ queryKey: ["bookings", "mine"] });
        const latest = queryClient.getQueryData<Array<{ id: string; status: string }>>(["bookings", "mine"])?.find((b) => b.id === bookingId);
        if (latest && bookingPaymentAction(latest.status) === "track") {
          void navigate({ to: "/booking/$bookingId/track", params: { bookingId } });
          return;
        }
        setPaymentFeedback((prev) => ({ ...prev, [bookingId]: latest?.status === "PAYMENT_FAILED" ? "failed" : "pending" }));
        return;
      }
      const result = await syncPayment({ data: { bookingId } });
      refresh();
      const outcome = paymentCheckOutcome(result);
      if (outcome === "paid") {
        toast.success(fr ? "Paiement confirmé." : "Payment confirmed.");
        void navigate({ to: "/booking/$bookingId/track", params: { bookingId } });
      } else {
        setPaymentFeedback((prev) => ({ ...prev, [bookingId]: outcome }));
      }
    } catch {
      setPaymentFeedback((prev) => ({ ...prev, [bookingId]: "unavailable" }));
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
      <Dialog open={!!paymentBooking} onOpenChange={(open) => { if (!open) setPaymentBooking(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{fr ? "Payer la réservation" : "Pay for booking"}</DialogTitle></DialogHeader>
          <p className="text-xl font-bold tabular-nums">{paymentBooking ? formatXAF(paymentBooking.price) : ""}</p>
          <div className="grid gap-2">
            <Button disabled={busyId === paymentBooking?.id} onClick={() => { if (paymentBooking) { const id = paymentBooking.id; setPaymentBooking(null); void pay(id, "CARD"); } }}><CreditCard className="size-4" />{fr ? "Carte" : "Card"}</Button>
            {mobileMoneyEnabled ? <Button variant="outline" onClick={() => { setMomoBooking(paymentBooking); setPaymentBooking(null); }}><Smartphone className="size-4" />Mobile Money</Button> : null}
            <Button variant="outline" onClick={() => { if (paymentBooking) { const { id, price } = paymentBooking; setPaymentBooking(null); void payBank(id, price); } }}><Landmark className="size-4" />{fr ? "Virement bancaire" : "Bank transfer"}</Button>
          </div>
        </DialogContent>
      </Dialog>
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
        <Tabs value={tab} onValueChange={(value) => void navigate({ to: "/bookings", search: { tab: value === "provider" ? "provider" : "client" } })}>
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="client">{fr ? "Mes réservations" : "My bookings"}</TabsTrigger>
            <TabsTrigger value="provider">{fr ? "Reçues" : "Received"}{pendingForProvider > 0 ? <span className="ml-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{pendingForProvider}</span> : null}</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      <Tabs value={historyView} onValueChange={value => setHistoryView(value === "ARCHIVED" ? "ARCHIVED" : "CURRENT")}>
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="CURRENT">{fr ? "Historique" : "History"}</TabsTrigger><TabsTrigger value="ARCHIVED">{fr ? "Archives" : "Archived"}</TabsTrigger></TabsList>
      </Tabs>
      {history.isError ? <p className="text-sm text-destructive">{fr ? "Impossible de charger les archives." : "Could not load archived history."}</p> : null}

      {(!studio || tab === "client") && (
        <section aria-label={fr ? "Mes réservations" : "My bookings"}>
          {isLoading || history.isLoading ? (
            <SkeletonRows rows={3} />
          ) : visibleClients.length === 0 ? (
            <EmptyState
              title={t("book.none")}
              description={fr ? "Trouvez un pro dans Découvrir." : "Find a pro in Discover."}
              icon={<CalendarDays className="size-5" aria-hidden />}
            />
          ) : (
            <ul className="space-y-3">
              {visibleClients.map((raw) => {
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
                  payment_provider: string | null;
                  provider: { business_name: string; city: string | null } | null;
                };
                const action = bookingPaymentAction(b.status);
                const payable = action === "pay";
                const expired = payable && (timeLeft(b.pay_by) ?? 1) <= 0;
                return (
                  <li key={b.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-foreground">{b.service_title}</p>
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
                      {canRemoveBookingHistory(b.status) ? <BookingHistoryActions archived={historyView === "ARCHIVED"} change={state => history.change(b.id, state)} /> : null}
                      {payable ? <Button size="sm" disabled={busyId === b.id || expired} onClick={() => setPaymentBooking({ id: b.id, price: Number(b.price) })}><CreditCard className="size-4" aria-hidden />{fr ? "Payer" : "Pay now"}</Button> : null}
                      {action === "track" ? <Button asChild size="sm"><Link to="/booking/$bookingId/track" params={{ bookingId: b.id }}><MapPin className="size-4" aria-hidden />{fr ? "Suivre le prestataire" : "Track provider"}</Link></Button> : null}
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
                          <RatingStars value={reviewed[b.id]?.rating ?? 0} size={12} />
                          {fr ? "Avis envoyé" : "Review sent"}
                        </span>
                      ) : null}
                    </div>
                    {action === "confirm" ? <BookingPaymentNotice provider={b.payment_provider} checking={busyId === b.id} feedback={paymentFeedback[b.id]} onCheck={() => void sync(b.id)} /> : null}
                    {["CONFIRMED", "IN_PROGRESS"].includes(b.status) ? <CustomerVerificationCode bookingId={b.id} /> : null}
                    {b.invoice_number ? (
                      <Link to="/booking/$bookingId/receipt" params={{ bookingId: b.id }} className="text-xs font-semibold text-primary underline">
                        {fr ? "Voir le reçu" : "View receipt"}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {studio && tab === "provider" ? (
        <SectionCard title={fr ? "Demandes reçues" : "Requests received"}>
          {visibleProviders.length === 0 ? (
            <EmptyState title={t("book.none")} icon={<CalendarDays className="size-5" aria-hidden />} />
          ) : (
            <ul className="space-y-3">
              {visibleProviders.map((b) => (
                <ProviderBookingItem
                  key={b.id}
                  booking={b}
                  busy={busyId === b.id}
                  onDecide={decide}
                  onProgress={progress}
                  onChat={() => void chat(b.provider_id, b.id)}
                  historyActions={canRemoveBookingHistory(b.status) ? <BookingHistoryActions archived={historyView === "ARCHIVED"} change={state => history.change(b.id, state)} /> : null}
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
  historyActions,
}: {
  booking: ProviderBookingRow;
  busy: boolean;
  onDecide: (id: string, decision: "ACCEPT" | "DECLINE", reason?: string) => Promise<void>;
  onProgress: (id: string, next: "IN_PROGRESS" | "COMPLETED" | "NO_SHOW") => Promise<void>;
  onChat: () => void;
  historyActions: React.ReactNode;
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
          {historyActions}
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
      {["CONFIRMED", "IN_PROGRESS"].includes(b.status) ? <VerifyServiceForm bookingId={b.id} /> : null}
      {["CONFIRMED", "IN_PROGRESS"].includes(b.status) && b.paid_at ? (
        <Link to="/booking/$bookingId/track" params={{ bookingId: b.id }} className="mr-3 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          {fr ? "Trajet : démarrer / arrivé" : "Trip: start / arrived"}
        </Link>
      ) : null}
      {b.paid_at ? (
        <Link to="/booking/$bookingId/receipt" params={{ bookingId: b.id }} className="text-xs font-semibold text-primary underline">
          {fr ? "Voir le reçu" : "View receipt"}
        </Link>
      ) : null}
    </li>
  );
}


/** Provider-only: never shows the code, only lets them enter it. */
function VerifyServiceForm({ bookingId }: { bookingId: string }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const verifyService = useServerFn(verifyBookingService);
  async function submit() {
    if (busy) return;
    setBusy(true);
    let r: { ok?: boolean; error?: string; attempts_left?: number; releaseStatus?: string };
    try {
      r = await verifyService({ data: { bookingId, code: value } });
    } catch {
      toast.error(fr ? "Vérification impossible." : "Could not verify.");
      return;
    } finally {
      setBusy(false);
    }
    if (!r?.ok) {
      const e = r?.error ?? "";
      toast.error(
        e === "WRONG_CODE"
          ? fr ? `Code incorrect (${r?.attempts_left ?? 0} essais restants)` : `Wrong code (${r?.attempts_left ?? 0} tries left)`
          : e === "LOCKED"
            ? fr ? "Trop d'essais. Contactez le support ASH." : "Too many tries. Contact ASH support."
            : e === "EXPIRED"
              ? fr ? "Code expiré. Contactez le support ASH." : "Code expired. Contact ASH support."
              : e === "NOT_PAYABLE_STATE"
                ? fr ? "Le paiement doit être confirmé avant de vérifier le service." : "Payment must be confirmed before service verification."
                : e === "NO_CODE"
                  ? fr ? "Aucun code client disponible. Actualisez la réservation ou contactez le support ASH." : "No customer code is available. Refresh the booking or contact ASH support."
                  : e === "STRIPE_RELEASE_AWAITING_APPROVAL"
                    ? fr ? "Le transfert Stripe nécessite une vérification du support ASH." : "The Stripe transfer needs ASH support review."
                    : e === "VERIFICATION_UNAVAILABLE"
                      ? fr ? "Vérification temporairement indisponible. Réessayez ou contactez le support ASH." : "Verification is temporarily unavailable. Retry or contact ASH support."
              : fr ? "Vérification impossible." : "Could not verify.",
      );
      return;
    }
    toast.success(r.releaseStatus === "TRANSFERRED"
      ? fr ? "Service vérifié — transfert vers votre compte Stripe enregistré." : "Service verified — transfer to your Stripe account recorded."
      : r.releaseStatus === "AVAILABLE_IN_WALLET"
        ? fr ? "Service vérifié — votre part est disponible dans le portefeuille ASH." : "Service verified — your share is available in your ASH wallet."
        : fr ? "Service vérifié — paiement du prestataire en attente." : "Service verified — provider payment pending.");
    setValue("");
    void queryClient.invalidateQueries();
  }
  return (
    <div id={`verify-${bookingId}`} className="mt-3 scroll-mt-6 rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        {fr ? "En attente de la vérification du client" : "Waiting for customer verification"}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase().slice(0, 12))}
          placeholder="ASH-XXXXXX"
          aria-label={fr ? "Code du client" : "Customer code"}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm tracking-widest"
        />
        <Button size="sm" disabled={busy || value.trim().length < 6} onClick={() => void submit()}>
          {fr ? "Vérifier le service" : "Verify service"}
        </Button>
      </div>
    </div>
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
