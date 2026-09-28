import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanStatusLabel, fcfa, methodLabel } from "@/lib/clean";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clean/receipt/$orderId")({
  head: () => ({
    meta: [
      { title: "ASH Clean receipt" },
      { name: "description", content: "Printable ASH Clean laundry receipt with order QR code." },
      { property: "og:title", content: "ASH Clean receipt" },
      { property: "og:description", content: "Present this receipt at the ASH Clean office." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CleanReceipt,
});

function CleanReceipt() {
  const { orderId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data } = useQuery({
    queryKey: ["clean", "receipt", orderId],
    queryFn: async () => {
      const [o, q, s, me] = await Promise.all([
        supabase.from("clean_orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("clean_price_quotes").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1),
        supabase.rpc("get_clean_public_settings").single(),
        supabase.auth.getUser(),
      ]);
      const uid = me.data.user?.id;
      const p = uid ? await supabase.from("profiles").select("full_name, phone").eq("user_id", uid).maybeSingle() : null;
      return { order: o.data, quote: q.data?.[0] ?? null, settings: s.data, profile: p?.data ?? null };
    },
  });
  const o = data?.order;
  if (!o) return <p className="p-6 text-sm text-muted-foreground">…</p>;
  const q = data.quote;
  const paid = o.payment_status === "PAID";
  // Every figure below comes from the one saved order + price quote, same as the payment.
  return (
    <div className="mx-auto w-full max-w-md pb-12">
      <div className="mb-3 flex justify-end print:hidden">
        <Button onClick={() => window.print()} className="rounded-full">
          <Printer className="size-4" /> {fr ? "Imprimer / PDF" : "Print / save PDF"}
        </Button>
      </div>
      <article className="space-y-4 rounded-3xl border border-border bg-card p-6 text-foreground print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl font-extrabold">ASH Clean</p>
            <p className="text-xs text-muted-foreground">ASH Global Technologies</p>
            <p className="text-xs text-muted-foreground">{data.settings?.facility_address}</p>
            <p className="text-xs text-muted-foreground">{data.settings?.facility_hours}</p>
          </div>
          <QRCodeSVG value={`ASHCLEAN:${o.order_no}:${o.id}`} size={96} level="M" includeMargin={false} />
        </header>
        <div className="rounded-2xl bg-muted p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{fr ? "Commande" : "Order"}</p>
          <p className="font-mono text-2xl font-extrabold">{o.order_no}</p>
          {o.receipt_no ? <p className="font-mono text-xs">{fr ? "Reçu" : "Receipt"} {o.receipt_no}</p> : null}
          <p className={paid ? "mt-1 text-sm font-bold text-primary" : "mt-1 text-sm font-bold text-muted-foreground"}>
            {paid ? (fr ? "PAYÉ" : "PAID") : q ? (fr ? "EN ATTENTE DE PAIEMENT" : "AWAITING PAYMENT") : fr ? "PRIX APRÈS PESÉE" : "PRICED AFTER WEIGHING"}
          </p>
        </div>
        <dl className="space-y-1 text-sm">
          <L k={fr ? "Client" : "Customer"} v={data.profile?.full_name ?? "—"} />
          <L k={fr ? "Téléphone" : "Phone"} v={o.contact_phone ?? data.profile?.phone ?? "—"} />
          <L k={fr ? "Réservé le" : "Booked"} v={formatDateTime(o.created_at)} />
          <L k={fr ? "Statut" : "Status"} v={cleanStatusLabel(o.status, fr)} />
          <L k={fr ? "Collecte" : "Pickup"} v={`${methodLabel(o.pickup_method)} · ${o.pickup_distance_km} km`} />
          <L k={fr ? "Livraison" : "Delivery"} v={`${methodLabel(o.delivery_method)} · ${o.delivery_distance_km} km`} />
        </dl>
        <dl className="space-y-1 border-t border-border pt-3 text-sm">
          {q ? (
            <>
              <L k={`${q.weight_kg} kg × ${fcfa(q.rate_per_kg)}`} v={fcfa(q.laundry_amount)} />
              {((q.special_items as { name: string; qty: number; amount: number }[]) ?? []).map((s) => (
                <L key={s.name} k={`${s.name} × ${s.qty}`} v={fcfa(s.amount)} />
              ))}
              <L k={fr ? "Frais de collecte" : "Pickup fee"} v={fcfa(q.pickup_fee)} />
              <L k={fr ? "Frais de livraison" : "Delivery fee"} v={fcfa(q.delivery_fee)} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold"><span>Total</span><span>{fcfa(q.total)}</span></div>
            </>
          ) : (
            <>
              <L k={fr ? "Frais de collecte" : "Pickup fee"} v={fcfa(o.pickup_fee)} />
              <L k={fr ? "Frais de livraison" : "Delivery fee"} v={fcfa(o.delivery_fee)} />
              <p className="text-xs text-muted-foreground">{fr ? "Le linge est facturé au poids vérifié à la réception." : "Laundry is charged on the verified weight at reception."}</p>
            </>
          )}
          {paid ? <L k={fr ? "Payé le" : "Paid on"} v={`${formatDateTime(o.paid_at)} · Mobile Money`} /> : null}
          {o.payment_reference ? <L k={fr ? "Référence" : "Reference"} v={o.payment_reference} /> : null}
        </dl>
        <p className="text-center text-xs text-muted-foreground">
          {fr ? "Présentez ce reçu (ou son QR code) au bureau ASH Clean pour déposer ou retirer votre linge." : "Show this receipt (or its QR code) at the ASH Clean office to drop off or collect your laundry."}
        </p>
      </article>
    </div>
  );
}

function L({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
