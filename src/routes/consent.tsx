import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { recordTermsAcceptance } from "@/lib/consent";
import { ZeroTolerance } from "@/components/refer/ZeroTolerance";

export const Route = createFileRoute("/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Agree to the ASH Glo terms" },
      {
        name: "description",
        content:
          "Review and accept the ASH Glo Terms of Service and Privacy Policy before you start using your account.",
      },
      { property: "og:title", content: "Agree to the ASH Glo terms" },
      { property: "og:description", content: "Accept the ASH Glo Terms of Service and Privacy Policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const navigate = useNavigate();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No session here means the link was opened directly — send them to sign in.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && !data.session) navigate({ to: "/login", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function accept() {
    if (!checked) return;
    setSaving(true);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      navigate({ to: "/login", replace: true });
      return;
    }
    const { error: updateError } = await recordTermsAcceptance(userId);
    setSaving(false);
    if (updateError) {
      setError(
        tx("We could not save your agreement. Try again.", "Nous n'avons pas pu enregistrer votre accord. Réessayez."),
      );
      return;
    }
    navigate({ to: "/setup-profile", replace: true });
  }

  return (
    <AuthLayout
      title={tx("ASH Glo Terms of Use", "Conditions d'utilisation d'ASH Glo")}
      subtitle={
        tx("Read and accept our terms and privacy policy.", "Lisez et acceptez nos conditions et notre politique de confidentialité.")
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {tx("You must be at least 13. Review our privacy, safety, payment and personalization rules before continuing.", "Vous devez avoir au moins 13 ans. Consultez nos règles sur la confidentialité, la sécurité, les paiements et la personnalisation avant de continuer.")}
          </p>
        </div>

        <ZeroTolerance fr={fr} />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
            className="mt-0.5"
            aria-label={tx("I agree", "J'accepte")}
          />
          <span className="text-sm text-foreground">
            {tx("I agree to the ASH Glo ", "J'accepte les ")}
            <Link to="/terms" className="font-semibold text-primary hover:underline">
              {tx("Terms of Use", "Conditions d'utilisation d'ASH Glo")}
            </Link>
            {tx(" and ", " et les ")}
            <Link to="/community-guidelines" className="font-semibold text-primary hover:underline">
              {tx("Community Guidelines", "Règles de la communauté")}
            </Link>
            {tx(", and I have read the ", ", et j'ai lu la ")}
            <Link to="/privacy" className="font-semibold text-primary hover:underline">
              {tx("Privacy Policy", "Politique de confidentialité")}
            </Link>
            .
          </span>
        </label>

        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="h-12 w-full" disabled={!checked || saving} onClick={() => void accept()}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {tx("Agree and continue", "Accepter et continuer")}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/support" className="hover:underline">
            {tx("Help & Support", "Aide et support")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
