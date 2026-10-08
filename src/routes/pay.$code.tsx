import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Smartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getPaymentLink, startLinkPayment, verifyLinkPayment } from "@/lib/storefront.functions";
import { paymentErrorMessage } from "@/lib/payment-errors";
import { PaymentMethodPicker, BankInstructions, BANK_UNAVAILABLE_TEXT } from "@/components/refer/PaymentMethodPicker";
import { startLinkAltPayment, syncLedgerPayment, type BankDetails } from "@/lib/payments-ledger.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/refer/Logo";
import { formatXAF } from "@/lib/format";

const SITE = "https://ashglogroup.company";

export const Route = createFileRoute("/pay/$code")({
  loader: async ({ params }) => {
    const link = await getPaymentLink({ data: { code: params.code } });
    if (!link) throw notFound();
    return { link };
  },
  head: ({ loaderData }) => {
    const link = loaderData?.link ?? null;
    if (!link) {
      return { meta: [{ title: "Payment link unavailable — ASH Glo" }, { name: "robots", content: "noindex" }] };
    }
    const title = `Pay ${link.amount.toLocaleString("fr-FR")} XAF — ${link.title} | ${link.business_name}`;
    const description = `Secure ASH Glo payment link from ${link.business_name}. ${link.description ?? "Pay with Mobile Money in seconds."}`.slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: `${SITE}/ash-social.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE}/ash-social.png` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Payment link not found</h1>
        <Button asChild className="mt-4">
          <Link to="/">Go to ASH Glo</Link>
        </Button>
      </div>
    </main>
  ),
  component: PayPage,
});

function PayPage() {
  const { link } = Route.useLoaderData();
  const start = useServerFn(startLinkPayment);
  const verify = useServerFn(verifyLinkPayment);
  const startAlt = useServerFn(startLinkAltPayment);
  const syncLedger = useServerFn(syncLedgerPayment);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll the server while a prompt is on the payer's phone. The reference can
  // also arrive in the URL (older links), which we honour the same way.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl) setReference(fromUrl);
    if (new URLSearchParams(window.location.search).get("card") === "cancel") setStatus("CANCELLED");
  }, []);

  useEffect(() => {
    if (!reference || status === "PAID") return;
    let cancelled = false;
    async function check() {
      const result = await verify({ data: { reference: reference! } });
      if (cancelled) return;
      if (result.ok && result.status === "PAID") { setStatus("PAID"); return; }
      // Card and bank payments are tracked on the central ledger.
      const ledger = await syncLedger({ data: { reference: reference! } });
      if (cancelled) return;
      if (ledger.status === "SUCCESS") setStatus("PAID");
      else if (ledger.status !== "NOT_FOUND") setStatus(ledger.status);
      else if (result.ok) setStatus(result.status);
    }
    void check();
    const id = setInterval(() => void check(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reference, status, verify]);

  async function payAlt(method: "CARD" | "BANK") {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setBusy(true);
    setError(null);
    const result = await startAlt({ data: { code: link.code, name, method, origin: window.location.origin } });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error === "BANK_UNAVAILABLE" ? BANK_UNAVAILABLE_TEXT
        : result.error === "CARD_UNAVAILABLE" ? "Card payment is currently unavailable. Please choose another payment method."
        : paymentErrorMessage(result.error, false, result.message),
      );
      return;
    }
    if (result.checkoutUrl) { window.location.href = result.checkoutUrl; return; }
    setBank(result.bank);
    setReference(result.reference);
    setStatus(result.status);
  }

  async function pay(provider: string, phone: string) {
    setBusy(true);
    setError(null);
    const result = await start({ data: { code: link.code, name, phone, provider } });
    setBusy(false);
    if (!result.ok) {
      const text = paymentErrorMessage(result.error, false, result.message);
      setError(text);
      toast.error(text);
      return;
    }
    setReference(result.reference);
    setStatus(result.status);
    toast.message("Check your phone and approve the payment prompt.");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{link.business_name}</span>
            {link.is_verified ? (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                <BadgeCheck className="size-3.5" aria-hidden />
                ASH Verified
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 font-display text-xl font-extrabold text-foreground">{link.title}</h1>
          {link.description ? <p className="mt-1 text-sm text-muted-foreground">{link.description}</p> : null}
          <p className="tabular mt-4 font-display text-3xl font-black text-foreground">{formatXAF(link.amount)}</p>

          {status === "PAID" ? (
            <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-center">
              <p className="font-display text-lg font-bold text-foreground">Payment received</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {link.business_name} has been notified. Keep this page as your receipt.
              </p>
            </div>
          ) : !link.is_active ? (
            <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              This payment link is no longer active.
            </p>
          ) : reference && bank ? (
            <div className="mt-5">
              <BankInstructions bank={bank} reference={reference} amountLabel={formatXAF(link.amount)} />
            </div>
          ) : reference ? (
            <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Smartphone className="size-4 text-primary" aria-hidden />
                Approve the prompt on your phone
              </p>
              <p className="tabular mt-2 text-xs text-muted-foreground">Reference {reference}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {status && status !== "PENDING" && status !== "PROCESSING"
                  ? `Last status: ${status}.`
                  : "We're checking with TchokoPay every few seconds."}
              </p>
              {status === "FAILED" || status === "CANCELLED" || status === "EXPIRED" ? (
                <Button variant="outline" className="mt-3 w-full" onClick={() => { setReference(null); setStatus(null); }}>
                  Choose another method
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              {error ? (
                <p role="alert" className="mb-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm">
                  {error}
                </p>
              ) : null}
              <PaymentMethodPicker
                busy={busy}
                amountLabel={`Pay ${formatXAF(link.amount)}`}
                onMomo={pay}
                onCard={() => payAlt("CARD")}
                onBank={() => payAlt("BANK")}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
                </div>
              </PaymentMethodPicker>
            </div>
          )}

          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            Secured by ASH Glo. A 1% platform fee applies to the seller, never to you.
          </p>
        </div>

        {link.slug ? (
          <p className="mt-4 text-center text-sm">
            <Link to="/s/$slug" params={{ slug: link.slug }} className="font-semibold text-primary">
              View {link.business_name}&apos;s storefront
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
