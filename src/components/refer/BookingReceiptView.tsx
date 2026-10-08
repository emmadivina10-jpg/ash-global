import { Printer, ShieldCheck } from "lucide-react";
import type { BookingReceipt } from "@/lib/booking-receipt.functions";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatXAF } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";

const methodName = (m: string | null, fr: boolean) =>
  !m ? "—" : m === "STRIPE" ? (fr ? "Carte" : "Card") : m === "BANK" ? (fr ? "Virement bancaire" : "Bank transfer") : m.includes("MTN") ? "MTN Mobile Money" : m.includes("ORANGE") ? "Orange Money" : "Mobile Money";

export function BookingReceiptView({ r, fr }: { r: BookingReceipt; fr: boolean }) {
  const lang = fr ? "fr" : "en";
  return (
    <div className="mx-auto w-full max-w-md pb-12">
      <div className="mb-3 flex justify-end print:hidden">
        <Button onClick={() => window.print()} className="rounded-full">
          <Printer className="size-4" /> {fr ? "Imprimer / PDF" : "Print / save PDF"}
        </Button>
      </div>
      <article className="space-y-4 rounded-3xl border border-border bg-card p-6 text-foreground print:border-0">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-xl font-extrabold text-primary">ASH Glo</p>
            <p className="text-xs text-muted-foreground">ASH Global Technologies</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{fr ? "Reçu officiel" : "Official receipt"}</p>
            <p className="font-mono text-sm font-bold">{r.receiptNumber ?? "—"}</p>
          </div>
        </header>
        <div className="rounded-2xl bg-muted p-3 text-center">
          <p className="text-3xl font-extrabold">{formatXAF(r.amount)}</p>
          {r.chargedAmount != null && r.chargedCurrency && r.chargedCurrency !== r.currency ? (
            <p className="text-xs text-muted-foreground">
              {fr ? "Débité" : "Charged"}: {r.chargedAmount.toLocaleString()} {r.chargedCurrency}
            </p>
          ) : null}
          <p className={r.paid ? "mt-1 text-sm font-bold text-primary" : "mt-1 text-sm font-bold text-muted-foreground"}>
            {r.paid ? (fr ? "PAYÉ" : "PAID") : fr ? "NON PAYÉ" : "NOT PAID"}
          </p>
        </div>

        <Section title={fr ? "Réservation" : "Booking"}>
          <L k={fr ? "N° réservation" : "Booking ID"} v={r.bookingId.slice(0, 8).toUpperCase()} />
          <L k={fr ? "Service" : "Service"} v={r.service} />
          {r.category ? <L k={fr ? "Catégorie" : "Category"} v={r.category.replace(/_/g, " ")} /> : null}
          <L k={fr ? "Date et heure" : "Date & time"} v={r.scheduledAt ? formatDateTime(r.scheduledAt) : "—"} />
          <L k={fr ? "Lieu" : "Location"} v={r.location ?? "—"} />
          <L k={fr ? "Statut" : "Status"} v={bookingStatusLabel(r.status, lang)} />
        </Section>

        <Section title={fr ? "Client" : "Customer"}>
          <Person name={r.customer.name} avatar={r.customer.avatar} />
          {r.customer.email ? <L k="Email" v={r.customer.email} /> : null}
          {r.customer.phone ? <L k={fr ? "Téléphone" : "Phone"} v={r.customer.phone} /> : null}
        </Section>

        <Section title={fr ? "Prestataire" : "Provider"}>
          <Person name={r.provider.name} avatar={r.provider.avatar} verified={r.provider.verified} />
          {r.provider.phone ? <L k={fr ? "Téléphone" : "Phone"} v={r.provider.phone} /> : null}
        </Section>

        <Section title={fr ? "Paiement" : "Payment"}>
          <L k={fr ? "Moyen" : "Method"} v={methodName(r.paymentMethod, fr)} />
          <L k={fr ? "Payé le" : "Paid on"} v={r.paidAt ? formatDateTime(r.paidAt) : "—"} />
          {r.transactionId ? <L k={fr ? "Transaction" : "Transaction ID"} v={r.transactionId} /> : null}
          {r.paymentReference ? <L k={fr ? "Référence" : "Reference"} v={r.paymentReference} /> : null}
          {r.viewer !== "CUSTOMER" && r.commission != null ? (
            <>
              <L k={`${fr ? "Commission ASH" : "ASH commission"}${r.commissionRate != null ? ` (${Math.round(r.commissionRate * 100)}%)` : ""}`} v={formatXAF(r.commission)} />
              <L k={fr ? "Part du prestataire" : "Provider entitlement"} v={r.providerEntitlement != null ? formatXAF(r.providerEntitlement) : "—"} />
              <L k={fr ? "Statut de la part" : "Entitlement status"} v={entitlementLabel(r.entitlementStatus, fr)} />
            </>
          ) : null}
        </Section>

        {r.viewer === "CUSTOMER" && r.paid ? (
          <div className="rounded-2xl border-2 border-dashed border-primary/40 p-4 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
              <ShieldCheck className="size-4" /> {fr ? "Code de vérification du service" : "Service verification code"}
            </p>
            {r.verificationCode ? (
              <p className="my-2 font-mono text-3xl font-extrabold tracking-widest">{r.verificationCode}</p>
            ) : (
              <p className="my-2 text-sm font-semibold">{r.codeUsed ? (fr ? "Code déjà utilisé — service vérifié" : "Code used — service verified") : fr ? "Code en préparation" : "Code not issued yet"}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {fr
                ? "Ne partagez ce code avec votre prestataire qu'au moment où le service est terminé. ASH ne vous le demandera jamais."
                : "Only share this code with your provider when the service is being completed. ASH will never ask you for it."}
            </p>
          </div>
        ) : r.viewer === "PROVIDER" ? (
          <p className="rounded-2xl bg-muted p-3 text-center text-xs text-muted-foreground">
            {fr
              ? "À la fin du service, le client vous donne son code privé. Saisissez-le dans Réservations pour libérer votre part dans votre portefeuille ASH."
              : "When the service is complete, the customer gives you their private code. Enter it in Bookings to release your share to your ASH wallet."}
          </p>
        ) : null}
      </article>
    </div>
  );
}

function entitlementLabel(s: string | null, fr: boolean) {
  if (s === "PENDING_VERIFICATION") return fr ? "En attente de vérification" : "Pending verification";
  if (s === "AVAILABLE_IN_WALLET") return fr ? "Disponible dans le portefeuille" : "Available in wallet";
  return "—";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1 border-t border-border pt-3 text-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Person({ name, avatar, verified }: { name: string | null; avatar: string | null; verified?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {avatar ? <img src={avatar} alt="" className="size-9 rounded-full object-cover" /> : <div className="size-9 rounded-full bg-muted" />}
      <span className="font-semibold">{name ?? "—"}</span>
      {verified ? <ShieldCheck className="size-4 text-primary" aria-label="Verified" /> : null}
    </div>
  );
}

function L({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="break-all text-right font-semibold">{v}</span>
    </div>
  );
}
