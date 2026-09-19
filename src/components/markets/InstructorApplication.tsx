import { useState } from "react";
import { CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyFxInstructorApplication, useSubmitFxInstructorApplication } from "@/lib/market-ecosystem.queries";

const STATUS_COPY = {
  SUBMITTED: "Application Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  ADDITIONAL_INFORMATION_REQUIRED: "Additional Information Required",
  REJECTED: "Rejected",
} as const;

export function InstructorApplication() {
  const { data: application, isLoading } = useMyFxInstructorApplication();
  const submit = useSubmitFxInstructorApplication();
  const [expertise, setExpertise] = useState("");

  if (isLoading) return <p className="py-10 text-center text-sm text-market-muted">Loading your application…</p>;
  if (application) {
    return (
      <div className="rounded-xl border border-market-line bg-market-surface p-5">
        <CheckCircle2 className="size-8 text-market-accent" aria-hidden />
        <h3 className="mt-4 font-display text-xl font-bold text-market-foreground">{STATUS_COPY[application.status]}</h3>
        <p className="mt-2 text-sm text-market-muted">Typically reviewed within 24–48 hours.</p>
        {application.admin_note ? <p className="mt-4 rounded-lg bg-market-elevated p-3 text-sm text-market-foreground">{application.admin_note}</p> : null}
        <p className="mt-4 text-xs leading-relaxed text-market-muted">Document upload does not mean identity verification. ASH review and external KYC verification are recorded separately.</p>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const governmentId = form.get("governmentId");
    const selfie = form.get("selfie");
    if (!(governmentId instanceof File) || !governmentId.size || !(selfie instanceof File) || !selfie.size) {
      toast.error("Add your government ID and selfie.");
      return;
    }
    try {
      await submit.mutateAsync({
        legalFullName: String(form.get("legalFullName") ?? ""),
        displayName: String(form.get("displayName") ?? ""),
        country: String(form.get("country")) === "NG" ? "NG" : "CM",
        dateOfBirth: String(form.get("dateOfBirth") ?? ""),
        profileSummary: String(form.get("profileSummary") ?? ""),
        tradingExperience: String(form.get("tradingExperience") ?? ""),
        yearsExperience: Number(form.get("yearsExperience") ?? 0),
        expertise: expertise.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
        tradingBackground: String(form.get("tradingBackground") ?? ""),
        governmentIdType: String(form.get("governmentIdType")) as "NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE",
        governmentId,
        selfie,
        declarationsAccepted: form.get("declarations") === "on",
      });
      toast.success("Application submitted for review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit the application.");
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
      <div className="rounded-xl border border-market-line bg-market-elevated p-4">
        <ShieldCheck className="size-6 text-market-accent" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-market-foreground">Private verification documents</p>
        <p className="mt-1 text-xs leading-relaxed text-market-muted">Only you and authorized reviewers can access your ID and selfie. Uploads are reviewed manually and are not presented as completed KYC.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full legal name"><Input name="legalFullName" minLength={2} maxLength={160} required /></Field>
        <Field label="Display name"><Input name="displayName" minLength={2} maxLength={100} required /></Field>
        <Field label="Country"><select name="country" className="h-10 w-full rounded-md border border-market-line bg-market-elevated px-3 text-sm text-market-foreground"><option value="CM">Cameroon</option><option value="NG">Nigeria</option></select></Field>
        <Field label="Date of birth"><Input name="dateOfBirth" type="date" required /></Field>
        <Field label="Years of experience"><Input name="yearsExperience" type="number" min={0} max={80} required /></Field>
        <Field label="ID type"><select name="governmentIdType" className="h-10 w-full rounded-md border border-market-line bg-market-elevated px-3 text-sm text-market-foreground"><option value="NATIONAL_ID">National ID</option><option value="PASSPORT">Passport</option><option value="DRIVERS_LICENSE">Driver’s licence</option></select></Field>
      </div>
      <Field label="Professional profile"><Textarea name="profileSummary" minLength={20} maxLength={1200} required /></Field>
      <Field label="Trading experience"><Textarea name="tradingExperience" minLength={20} maxLength={2000} required /></Field>
      <Field label="Areas of expertise"><Input value={expertise} onChange={(event) => setExpertise(event.target.value)} placeholder="Market structure, risk management, EUR/USD" required /></Field>
      <Field label="Trading background"><Textarea name="tradingBackground" minLength={20} maxLength={3000} required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Government ID"><Input name="governmentId" type="file" accept="image/jpeg,image/png,application/pdf" required /></Field>
        <Field label="Selfie / face photo"><Input name="selfie" type="file" accept="image/jpeg,image/png" required /></Field>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-market-line p-4 text-sm text-market-muted">
        <input name="declarations" type="checkbox" required className="mt-1" />
        <span>I attest that the information is accurate, the documents are mine, and my Markets content will remain educational and informational—not personalized financial advice.</span>
      </label>
      <Button type="submit" disabled={submit.isPending} className="w-full bg-market-accent text-market-accent-foreground hover:bg-market-accent/90">
        <FileCheck2 className="size-4" aria-hidden /> {submit.isPending ? "Submitting securely…" : "Submit Application"}
      </Button>
      <p className="text-center text-xs text-market-muted">Typically reviewed within 24–48 hours.</p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-market-foreground">{label}</Label>{children}</div>;
}
