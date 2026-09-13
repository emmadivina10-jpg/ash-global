import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { SocialAuth } from "@/components/refer/SocialAuth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — ASH Glo" },
      { name: "description", content: "Sign in to your ASH Glo account to track referrals, earnings and withdrawals." },
      { property: "og:title", content: "Login — ASH Glo" },
      { property: "og:description", content: "Sign in to your ASH Glo account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setUnconfirmed(false);
    setResent(false);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (signInError) {
      const message = signInError.message.toLowerCase();
      if (message.includes("email not confirmed") || message.includes("not confirmed")) {
        setUnconfirmed(true);
        setError(t("auth.login.unconfirmed"));
      } else {
        setError(
          message.includes("invalid")
            ? t("auth.login.invalid")
            : signInError.message,
        );
      }
      return;
    }
    toast.success(t("auth.login.welcome"));
    navigate({ to: "/services" });
  }

  async function resendConfirmation() {
    if (resending || !email.trim()) return;
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (resendError) {
      toast.error(resendError.message);
      return;
    }
    setResent(true);
    toast.success(t("auth.login.resent"));
  }

  return (
    <AuthLayout title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              {t("auth.login.forgot")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? (
          <div role="alert" className="space-y-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <p>{error}</p>
            {unconfirmed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={resending || resent}
                onClick={resendConfirmation}
              >
                {resending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {resending ? t("auth.login.resending") : t("auth.login.resend")}
              </Button>
            ) : null}
            {resent ? <p className="text-xs text-muted-foreground">{t("auth.login.resent")}</p> : null}
          </div>
        ) : null}

        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {loading ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>

      <SocialAuth label={t("auth.login.orContinue")} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          {t("auth.login.createAccount")}
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <a
          href="https://ash-glo-support.base44.app"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary hover:underline"
        >
          Help & Support
        </a>
      </p>
    </AuthLayout>
  );
}
