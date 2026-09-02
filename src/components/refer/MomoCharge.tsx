import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Smartphone } from "lucide-react";
import { listPaymentProviders } from "@/lib/tchokopay.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Mobile money form: pick a network, enter the number, approve the prompt.
 *
 * The network list comes from TchokoPay (GET /account/providers) rather than a
 * hardcoded list, so a newly enabled network shows up without a deploy.
 */
export function MomoCharge({
  country = "CM",
  busy,
  submitLabel,
  onCharge,
  children,
  fr = false,
  className,
}: {
  country?: string;
  busy: boolean;
  submitLabel: string;
  onCharge: (provider: string, phone: string) => void | Promise<void>;
  children?: React.ReactNode;
  fr?: boolean;
  className?: string;
}) {
  const load = useServerFn(listPaymentProviders);
  const { data, isLoading } = useQuery({
    queryKey: ["momo-providers", country],
    queryFn: () => load({ data: { country } }),
    staleTime: 5 * 60_000,
  });

  const providers = data?.providers ?? [];
  const [provider, setProvider] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!provider && providers.length) setProvider(providers[0]!.provider);
  }, [providers, provider]);

  const ready = Boolean(provider) && phone.replace(/\D+/g, "").length >= 8 && !busy;

  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) void onCharge(provider, phone);
      }}
    >
      {children}

      <div className="space-y-2">
        <Label>{fr ? "Réseau Mobile Money" : "Mobile Money network"}</Label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {fr ? "Chargement des réseaux…" : "Loading networks…"}
          </div>
        ) : providers.length === 0 ? (
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            {fr
              ? "Aucun réseau Mobile Money n'est disponible pour le moment."
              : "No mobile money network is available right now."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {providers.map((option) => (
              <button
                key={option.provider}
                type="button"
                aria-pressed={provider === option.provider}
                onClick={() => setProvider(option.provider)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border p-3 text-left text-sm font-semibold transition",
                  provider === option.provider
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                <Smartphone className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{option.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="momo-phone">{fr ? "Numéro Mobile Money" : "Mobile Money number"}</Label>
        <Input
          id="momo-phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="6XXXXXXXX"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          maxLength={20}
          required
        />
        <p className="text-xs text-muted-foreground">
          {fr
            ? "Vous recevrez une demande de confirmation sur ce téléphone."
            : "You'll get an approval prompt on this phone."}
        </p>
      </div>

      <Button type="submit" className="h-12 w-full" disabled={!ready}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
