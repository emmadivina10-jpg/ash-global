import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateReferralCode } from "@/lib/referrals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { CountryPhoneInput } from "@/components/refer/CountryPhoneInput";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SocialAuth } from "@/components/refer/SocialAuth";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { useI18n, type TKey } from "@/lib/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZeroTolerance } from "@/components/refer/ZeroTolerance";
import {
  TERMS_VERSION,
  markPendingTermsAgreement,
  nextOnboardingRoute,
  recordTermsAcceptance,
} from "@/lib/consent";

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
        // Accept plausible international numbers for supported and future regions.
        .refine((value) => isValidPhone(value), t("auth.err.phone")),
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
        content: "Create your ASH Glo account for commerce, services, community, messaging and eligible regional referral rewards.",
      },
      { property: "og:title", content: "Create your ASH Glo account" },
      { property: "og:description", content: "Join ASH Glo and start earning referral rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const { t, lang } = useI18n();
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  function goNext() {
    const schema = buildSchema(t);
    const fieldErrors: Record<string, string> = {};
    if (step === 1) {
      const parsed = schema.safeParse({ ...form, password: "xxxxxxxx", confirmPassword: "xxxxxxxx" });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          if (["fullName", "email", "phone"].includes(key) && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
      }
    } else if (step === 2) {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0]);
          if (["password", "confirmPassword"].includes(key) && !fieldErrors[key]) fieldErrors[key] = issue.message;
        }
      }
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) setStep(step === 1 ? 2 : 3);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (step !== 3) {
      goNext();
      return;
    }
    const parsed = buildSchema(t).safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      if (fieldErrors["fullName"] || fieldErrors["email"] || fieldErrors["phone"]) setStep(1);
      else if (fieldErrors["password"] || fieldErrors["confirmPassword"]) setStep(2);
      return;
    }

    const code = (parsed.data.referralCode ?? "").trim().toUpperCase();
    if (code && refState === "invalid") {
      setErrors({ referralCode: t("auth.register.refMissing") });
      setStep(2);
      return;
    }

    if (!agreed) {
      setErrors({ form: "You must agree to the ASH Glo Terms of Use and Community Guidelines." });
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          referral_code: code,
          terms_version: TERMS_VERSION,
          terms_agreed_at: new Date().toISOString(),
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
      await recordTermsAcceptance(session.session.user.id);
      navigate({ to: await nextOnboardingRoute(session.session.user.id) });
      return;
    }
    setDone(true);
  }

  // While waiting for email confirmation, quietly retry signing in with the
  // credentials just entered. Sign-in only succeeds once the email is
  // verified, so new members continue into onboarding without the Login page.
  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    let tries = 0;
    async function attempt() {
      if (cancelled) return;
      tries += 1;
      const { data: existing } = await supabase.auth.getSession();
      let userId = existing.session?.user.id;
      if (!userId) {
        const { data } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        userId = data.session?.user.id;
      }
      if (cancelled) return;
      if (userId) {
        navigate({ to: await nextOnboardingRoute(userId), replace: true });
        return;
      }
      if (tries < 180) timer = window.setTimeout(attempt, 5000);
    }
    let timer = window.setTimeout(attempt, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [done, form.email, form.password, navigate]);

  if (done) {
    return (
      <AuthLayout title={t("auth.register.checkEmail")} subtitle={t("auth.register.checkEmailSub")}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">
            {t("auth.register.checkEmailCopy", { email: form.email })}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {lang === "fr"
              ? "Après confirmation, vous continuerez automatiquement ici."
              : "Once you confirm, you'll continue here automatically."}
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
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <StepBar step={step} />
        <div key={step} className="auth-step grid gap-4">
        {step === 1 ? (
        <>
          <div className="sm:col-span-2">
            <Field label={t("auth.register.fullName")} id="fullName" error={errors["fullName"]}>
              <Input
                id="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                placeholder="Jean Nkeng"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
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
          </div>

          <div className="sm:col-span-2">
            <Field label={t("auth.register.phone")} id="phone" error={errors["phone"]}>
              <CountryPhoneInput id="phone" onChange={(v) => update("phone", v)} />
            </Field>
          </div>

        </>
        ) : step === 2 ? (
        <>
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

          <div className="sm:col-span-2">
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
          </div>
        </>
        ) : (
        /* terms step */
        <section aria-labelledby="terms-heading" className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:col-span-2">
          <h2 id="terms-heading" className="text-sm font-bold text-foreground">
            {lang === "fr" ? "Conditions d'utilisation et règles de la communauté" : "Terms of Use & Community Standards"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lang === "fr"
              ? "Avant de rejoindre ASH Glo, veuillez lire et accepter nos Conditions d'utilisation et nos Règles de la communauté."
              : "Before joining ASH Glo, please review and agree to our Terms of Use and Community Standards."}
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={() => setTermsOpen(true)}>
            <FileText className="size-4" aria-hidden />
            {lang === "fr" ? "Voir les conditions" : "View Terms"}
          </Button>
          <ZeroTolerance fr={lang === "fr"} />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4">
            <Checkbox
              checked={agreed}
              onCheckedChange={(value) => {
                const next = value === true;
                setAgreed(next);
                markPendingTermsAgreement(next);
              }}
              className="mt-0.5"
              aria-label="I agree to the ASH Glo Terms of Use and Community Standards"
            />
            <span className="text-sm text-foreground">
              {lang === "fr"
                ? "J'accepte les Conditions d'utilisation et les Règles de la communauté d'ASH Glo, j'ai lu la "
                : "I agree to the ASH Glo Terms of Use and Community Standards, and I have read the "}
              <Link to="/privacy" className="font-semibold text-primary hover:underline">
                {lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}
              </Link>
              {lang === "fr" ? ". J'ai au moins 13 ans." : ". I am at least 13."}
            </span>
          </label>
        </section>
        )}
        </div>

        {errors["form"] ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {errors["form"]}
          </p>
        ) : null}



        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="flex h-[85dvh] max-w-2xl flex-col gap-3 p-4">
            <DialogHeader>
              <DialogTitle>{lang === "fr" ? "Conditions d'utilisation d'ASH Glo" : "ASH Glo Terms of Use"}</DialogTitle>
            </DialogHeader>
            <iframe
              src="/terms"
              title="ASH Glo Terms of Use"
              className="min-h-0 w-full flex-1 rounded-lg border border-border bg-background"
            />
            <Button type="button" onClick={() => setTermsOpen(false)}>
              {lang === "fr" ? "Retour à l'inscription" : "Back to sign up"}
            </Button>
          </DialogContent>
        </Dialog>

        {step === 1 ? (
          <Button type="submit" className="auth-cta group h-12 w-full rounded-xl text-base">
            {lang === "fr" ? "Continuer" : "Continue"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="h-12 rounded-xl px-4" onClick={() => setStep(1)} aria-label="Back">
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
            <Button type="submit" className="auth-cta h-12 flex-1 rounded-xl text-base" disabled={loading || !agreed}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {loading ? t("auth.register.submitting") : t("auth.register.submit")}
            </Button>
          </div>
        )}

      </form>

      {step === 1 || agreed ? <SocialAuth label={t("auth.register.orSignUp")} /> : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
}

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((n) => (
        <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <span className={`block h-full rounded-full bg-primary transition-all duration-500 ${step >= n ? "w-full" : "w-0"}`} />
        </span>
      ))}
      <span className="ml-1 text-xs font-semibold text-muted-foreground">{step}/2</span>
    </div>
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
