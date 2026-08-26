import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getPaymentLink, startLinkPayment, verifyLinkPayment } from "@/lib/storefront.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/refer/Logo";
import { formatXAF } from "@/lib/format";

const SITE = "https://growrefer.app";

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
    <main className="grid min-h-screen place-items-center p-6 text-center">
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Coming back from the checkout page: confirm with the provider API.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    setBusy(true);
    void verify({ data: { reference: ref } })
      .then((r) => setStatus(r.ok ? r.status : "UNVERIFIED"))
      .finally(() => setBusy(false));
  }, [verify]);

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await start({ data: { code: link.code, name, phone } });
    setBusy(false);
    if (!result.ok || !result.checkoutUrl) {
      toast.error(result.ok ? "Could not open checkout." : "Payment could not start. Try again.");
      return;
    }
    window.location.href = result.checkoutUrl;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
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
          ) : (
            <form className="mt-5 space-y-3" onSubmit={pay}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Money number</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="6XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  maxLength={20}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !name || !phone}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Pay {formatXAF(link.amount)}
              </Button>
              {status && status !== "PAID" ? (
                <p className="text-center text-xs text-muted-foreground">Last attempt: {status}</p>
              ) : null}
            </form>
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
