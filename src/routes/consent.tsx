import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";

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
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
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
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq("user_id", userId);
    setSaving(false);
    if (updateError) {
      setError(
        fr ? "Nous n'avons pas pu enregistrer votre accord. Réessayez." : "We could not save your agreement. Try again.",
      );
      return;
    }
    navigate({ to: "/setup-profile", replace: true });
  }

  return (
    <AuthLayout
      title={fr ? "Avant de commencer" : "Before you start"}
      subtitle={
        fr
          ? "Lisez et acceptez nos conditions et notre politique de confidentialité."
          : "Read and accept our terms and privacy policy."
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {fr
              ? "Vous devez avoir au moins 13 ans. Consultez nos règles sur la confidentialité, la sécurité, les paiements et la personnalisation avant de continuer."
              : "You must be at least 13. Review our privacy, safety, payment and personalization rules before continuing."}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => setChecked(value === true)}
            className="mt-0.5"
            aria-label={fr ? "J'accepte" : "I agree"}
          />
          <span className="text-sm text-foreground">
            {fr ? "J'ai lu et j'accepte les " : "I have read and agree to the "}
            <Link to="/terms" className="font-semibold text-primary hover:underline">
              {fr ? "Conditions d'utilisation" : "Terms of Service"}
            </Link>
            {fr ? " et la " : " and the "}
            <Link to="/privacy" className="font-semibold text-primary hover:underline">
              {fr ? "Politique de confidentialité" : "Privacy Policy"}
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
          {fr ? "Accepter et continuer" : "Agree and continue"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/support" className="hover:underline">
            {fr ? "Aide et support" : "Help & Support"}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
