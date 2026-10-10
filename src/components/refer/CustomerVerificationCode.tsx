import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Customer-only: the private code that releases the provider's earnings.
 * Readable only by the customer (database rule); it appears as soon as the
 * payment is confirmed, and refreshes until then.
 */
export function CustomerVerificationCode({ bookingId, className }: { bookingId: string; className?: string }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void supabase
        .from("booking_verification_codes")
        .select("code, used_at")
        .eq("booking_id", bookingId)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setCode(data && !data.used_at ? data.code : null);
        });
    load();
    const timer = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [bookingId]);
  if (!code) return null;
  return (
    <div className={cn("mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {tx("Service verification code", "Code de vérification du service")}
      </p>
      <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-foreground">{code}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tx("Give this code to the provider only after the service is done. It authorizes processing of their payable share.", "Donnez ce code au prestataire seulement une fois le service rendu. Il autorise le traitement de sa part payable.")}
      </p>
    </div>
  );
}
