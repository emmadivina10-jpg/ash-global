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
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CM_PHONE_REGEX, formatDate, normalizePhone, referralLink } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Refer" },
      { name: "description", content: "Manage your Refer profile, referral link and account status." },
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (fullName.trim().length < 3) {
      setError("Enter your full name.");
      return;
    }
    if (!CM_PHONE_REGEX.test(normalizePhone(phone))) {
      setError("Enter a valid Cameroon number.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: normalizePhone(phone) })
      .eq("user_id", profile?.user_id ?? "");
    setSaving(false);
    if (updateError) {
      setError("We could not save your changes. Please try again.");
      return;
    }
    toast.success("Profile updated");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (isLoading || !profile) {
    return <SkeletonRows rows={4} />;
  }

  const active = profile.account_status === "ACTIVE";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{profile.full_name || "Profile"}</h1>
          <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <StatusBadge
          status={profile.account_status}
          label={active ? "Active" : "Pending activation"}
        />
      </header>

      {!active ? (
        <SectionCard className="border-gold/40 bg-gold/10">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-sm text-foreground">
              Your account is pending activation. Pay 5,000 XAF once to start earning.
            </p>
            <Button asChild>
              <Link to="/activate">Activate now</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Account details">
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save changes
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Referral details">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Referral code</dt>
            <dd className="tabular font-bold text-primary">{profile.referral_code}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Member since</dt>
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
