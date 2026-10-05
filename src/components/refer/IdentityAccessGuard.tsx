import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { identityStatus } from "@/lib/identity-client";
import type { IdentityStatus } from "@/lib/identity.functions";
import { useI18n } from "@/lib/i18n";

export function IdentityAccessGuard() {
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const loggingOut = useRef(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const { lang } = useI18n();
  const fr = lang === "fr";
  useEffect(() => {
    let stopped = false;
    const apply = async (next: IdentityStatus) => {
      if (stopped) return;
      setStatus(next);
      if (!next.banned || loggingOut.current) return;
      loggingOut.current = true;
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      void navigate({ to: "/safety-review", search: { identity: true, banned: true }, replace: true });
    };
    const check = () => { void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setStatus(null); loggingOut.current = false; return; }
      void identityStatus().then(apply).catch(() => undefined);
    }); };
    const denied = (event: Event) => { void apply((event as CustomEvent<IdentityStatus>).detail); };
    check();
    const timer = window.setInterval(check, 5000);
    window.addEventListener("ash-identity-denied", denied);
    window.addEventListener("focus", check);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("ash-identity-denied", denied); window.removeEventListener("focus", check); };
  }, [navigate, qc]);
  if (!status?.restricted || pathname === "/safety-review" || pathname.startsWith("/console") || pathname === "/login" || pathname === "/support") return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="identity-denied-title" className="fixed inset-0 z-[100] grid place-items-center bg-background p-6">
      <section className="w-full max-w-md text-center">
        <ShieldAlert className="mx-auto size-12 text-destructive" aria-hidden />
        <h1 id="identity-denied-title" className="mt-4 text-2xl font-bold text-destructive">{fr ? "Refusé" : "Denied"}</h1>
        <p className="mt-3 text-sm text-foreground">{fr ? "Ce nom ou cette photo appartient à un compte vérifié." : "This name or profile picture belongs to a verified account."}</p>
        <p className="mt-2 text-sm text-muted-foreground">{status.banned ? (fr ? "Compte banni. Déconnexion en cours." : "Account banned. Signing you out.") : (fr ? `Accès restreint · ${status.attempts}/3 tentatives. La quatrième entraîne un bannissement.` : `Access restricted · ${status.attempts}/3 attempts. A fourth attempt results in a ban.`)}</p>
        {!status.banned && <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => void navigate({ to: "/safety-review", search: { identity: true, banned: false } })}>{fr ? "Vérification du compte" : "Account review"}</Button>
          <Button variant="outline" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); void navigate({ to: "/login", replace: true }); }}>{fr ? "Déconnexion" : "Sign out"}</Button>
        </div>}
      </section>
    </div>
  );
}