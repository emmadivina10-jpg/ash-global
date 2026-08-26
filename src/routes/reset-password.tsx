import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — ASH Glo REFER" },
      { name: "description", content: "Choose a new password for your ASH Glo REFER account." },
      { property: "og:title", content: "Set a new password — ASH Glo REFER" },
      { property: "og:description", content: "Choose a new password for your ASH Glo REFER account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError(t("auth.err.passwordMin"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.err.passwordMatch"));
      return;
    }
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success(t("auth.reset.updated"));
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthLayout title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.reset.new")}</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("auth.reset.confirm")}</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t("auth.reset.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
