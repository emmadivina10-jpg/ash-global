import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { CopyReferralButton } from "@/components/refer/ReferralCard";
import { AvatarUpload } from "@/components/refer/AvatarUpload";

import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVATION_FEE, formatDate, formatXAF, isValidPhone, normalizePhone, referralLink } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ASH Glo" },
      { name: "description", content: "Manage your ASH Glo profile, referral link and account status." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const fee = formatXAF(ACTIVATION_FEE);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 3) {
      setError(t("profile.err.name"));
      return;
    }
    if (!isValidPhone(phone)) {
      setError(t("profile.err.phone"));
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const userId = profile?.user_id ?? auth.user?.id;
    if (!userId) {
      setError(t("profile.err.save"));
      return;
    }
    setError(null);
    setSaving(true);
    const { data: saved, error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: normalizePhone(phone) })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();
    setSaving(false);
    if (updateError) {
      setError(updateError.message || t("profile.err.save"));
      return;
    }
    if (!saved) {
      // No row matched — the account has no profile record yet.
      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: userId,
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        email: auth.user?.email ?? "",
        referral_code: "",
      } as never);
      if (insertError) {
        setError(t("profile.err.save"));
        return;
      }
    }
    toast.success(t("profile.saved"));
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    // Wrap up: leave edit mode, confirm briefly, and hide the save button
    // until the member chooses to edit again.
    setEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (isLoading) {
    return <SkeletonRows rows={4} />;
  }

  if (!profile) {
    return (
      <SectionCard title={t("profile.title")}>
        <p className="text-sm text-muted-foreground">
          We could not load your profile. Please sign out and sign in again.
        </p>
        <Button variant="outline" className="mt-4" onClick={signOut}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </SectionCard>
    );
  }


  const active = profile.account_status === "ACTIVE";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{profile.full_name || t("profile.title")}</h1>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <StatusBadge
          status={profile.account_status}
          label={active ? t("shell.active") : t("shell.pending")}
        />
      </header>

      {!active ? (
        <SectionCard className="border-gold/40 bg-gold/10">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-sm text-foreground">
              {t("profile.pendingCopy", { fee })}
            </p>
            <Button asChild>
              <Link to="/activate">{t("profile.activateNow")}</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title={t("profile.accountDetails")}>
        <div className="mb-5 border-b border-border pb-5">
          <AvatarUpload
            userId={profile.user_id}
            path={profile.avatar_url}
            name={profile.full_name}
            onUploaded={async (avatarPath) => {
              const { error: avatarError } = await supabase
                .from("profiles")
                .update({ avatar_url: avatarPath })
                .eq("user_id", profile.user_id);
              if (avatarError) throw new Error(avatarError.message);
              await queryClient.invalidateQueries({ queryKey: ["profile"] });
            }}
          />
        </div>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="space-y-2">

            <Label htmlFor="fullName">{t("profile.fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("profile.email")}</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("profile.phone")}</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t("profile.save")}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title={t("profile.referralDetails")}>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{t("profile.referralCode")}</dt>
            <dd className="tabular font-bold text-primary">{profile.referral_code}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{t("profile.memberSince")}</dt>
            <dd className="font-semibold">{formatDate(profile.created_at)}</dd>
          </div>
        </dl>
        <p className="mt-4 break-all rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          {referralLink(profile.referral_code)}
        </p>
        <div className="mt-3">
          <CopyReferralButton value={referralLink(profile.referral_code)} />
        </div>
      </SectionCard>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="size-4" aria-hidden />
        Sign out
      </Button>
    </div>
  );
}
