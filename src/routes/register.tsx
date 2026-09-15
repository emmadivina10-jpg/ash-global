import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateReferralCode } from "@/lib/referrals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { SocialAuth } from "@/components/refer/SocialAuth";
import { CM_PHONE_REGEX, normalizePhone } from "@/lib/format";
import { useI18n, type TKey } from "@/lib/i18n";

/** Validation messages follow the selected language. */
function buildSchema(t: (k: TKey) => string) {
  return z
    .object({
      fullName: z.string().trim().min(3, t("auth.err.name")).max(80),
      email: z.string().trim().email(t("auth.err.email")).max(255),
      phone: z
        .string()
        .trim()
        .transform(normalizePhone)
        .refine((value) => CM_PHONE_REGEX.test(value), t("auth.err.phone")),
      password: z.string().min(8, t("auth.err.passwordMin")).max(72),
      confirmPassword: z.string(),
      referralCode: z.string().trim().max(32).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.err.passwordMatch"),
      path: ["confirmPassword"],
    });
}

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] } : {},
  head: () => ({
    meta: [
      { title: "Create your ASH Glo account" },
      {
        name: "description",
        content: "Join ASH Glo in minutes, activate for 5,000 XAF and start earning referral rewards on three levels.",
      },
      { property: "og:title", content: "Create your ASH Glo account" },
      { property: "og:description", content: "Join ASH Glo and start earning referral rewards." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const { t } = useI18n();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    referralCode: ref ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [refState, setRefState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  useEffect(() => {
    const code = form.referralCode.trim().toUpperCase();
    if (!code) {
      setRefState("idle");
      return;
    }
    setRefState("checking");
    const timer = setTimeout(async () => {
      const result = await validateReferralCode({ data: { code } });
      setRefState(result.valid ? "valid" : "invalid");
    }, 400);
    return () => clearTimeout(timer);
  }, [form.referralCode]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = buildSchema(t).safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const code = (parsed.data.referralCode ?? "").trim().toUpperCase();
    if (code && refState === "invalid") {
      setErrors({ referralCode: t("auth.register.refMissing") });
      return;
    }

    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          referral_code: code,
        },
      },
    });
    setLoading(false);

    if (error) {
      setErrors({
        form: error.message.toLowerCase().includes("already")
          ? t("auth.register.exists")
          : error.message,
      });
      return;
    }

    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      toast.success(t("auth.register.created"));
      navigate({ to: "/consent" });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout title={t("auth.register.checkEmail")} subtitle={t("auth.register.checkEmailSub")}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">
            {t("auth.register.checkEmailCopy", { email: form.email })}
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/login">{t("auth.register.goLogin")}</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("auth.register.fullName")} id="fullName" error={errors["fullName"]}>
          <Input
            id="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Jean Nkeng"
          />
        </Field>

        <Field label={t("auth.email")} id="email" error={errors["email"]}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label={t("auth.register.phone")} id="phone" error={errors["phone"]} hint={t("auth.register.phoneHint")}>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="6XX XXX XXX"
          />
        </Field>

        <Field label={t("auth.password")} id="password" error={errors["password"]}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>

        <Field label={t("auth.register.confirmPassword")} id="confirmPassword" error={errors["confirmPassword"]}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
          />
        </Field>

        <Field
          label={t("auth.register.referral")}
          id="referralCode"
          error={errors["referralCode"]}
          hint={
            refState === "checking"
              ? t("auth.register.refChecking")
              : refState === "valid"
                ? t("auth.register.refValid")
                : refState === "invalid"
                  ? t("auth.register.refInvalid")
                  : undefined
          }
        >
          <Input
            id="referralCode"
            value={form.referralCode}
            onChange={(event) => update("referralCode", event.target.value.toUpperCase())}
            placeholder="REFER-ABC123"
          />
        </Field>

        {errors["form"] ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {errors["form"]}
          </p>
        ) : null}

        <Button type="submit" className="h-12 w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {loading ? t("auth.register.submitting") : t("auth.register.submit")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("auth.register.activationNote")}
        </p>
      </form>

      <SocialAuth label={t("auth.register.orSignUp")} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
