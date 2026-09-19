import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, FileImage, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/refer/states";
import { decideFxInstructorApplication, listFxInstructorApplications } from "@/lib/instructor-admin.functions";

export const Route = createFileRoute("/console/instructors")({
  ssr: false,
  head: () => ({ meta: [{ title: "FX Instructor Reviews — ASH Console" }, { name: "description", content: "Private FX instructor application review queue." }, { name: "robots", content: "noindex, nofollow" }, { property: "og:title", content: "FX Instructor Reviews — ASH Console" }, { property: "og:description", content: "Private FX instructor application review queue." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InstructorReviews,
});

function InstructorReviews() {
  const load = useServerFn(listFxInstructorApplications);
  const decide = useServerFn(decideFxInstructorApplication);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["console", "fx-instructor-applications"], queryFn: load });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (isLoading) return <LoadingState label="Loading FX instructor applications…" />;

  async function act(id: string, status: "UNDER_REVIEW" | "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED") {
    setBusy(id);
    try {
      const note = notes[id];
      await decide({ data: note ? { applicationId: id, status, note } : { applicationId: id, status } });
      toast.success(`Application marked ${status.toLowerCase().replaceAll("_", " ")}.`);
      await queryClient.invalidateQueries({ queryKey: ["console", "fx-instructor-applications"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update the application."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-6"><header><h2 className="font-display text-xl font-extrabold text-foreground">FX Instructor Reviews</h2><p className="text-sm text-muted-foreground">Manual ASH review for Cameroon and Nigeria. Uploaded documents are not treated as completed KYC.</p></header><div className="rounded-xl border border-border bg-card p-4"><div className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-primary"/><p className="text-xs leading-relaxed text-muted-foreground">Compare the selfie and ID carefully, record a clear reason, and approve only genuine educational professionals. External KYC status remains separate.</p></div></div><div className="space-y-4">{!data?.length ? <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">No applications yet.</p> : data.map((item) => <article key={item.id} className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-foreground">{item.legal_full_name}</h3><p className="text-xs text-muted-foreground">{item.display_name} · {item.country} · {item.years_experience} years</p></div><Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge></div><div className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><Info label="Professional profile" value={item.profile_summary}/><Info label="Trading experience" value={item.trading_experience}/><Info label="Expertise" value={(item.expertise ?? []).join(", ")}/><Info label="Background" value={item.trading_background}/><Info label="Date of birth" value={item.date_of_birth}/><Info label="KYC" value={`${item.kyc_status}${item.kyc_provider ? ` · ${item.kyc_provider}` : " · provider not connected"}`}/></div><div className="mt-4 grid grid-cols-2 gap-3">{item.governmentIdUrl ? <a href={item.governmentIdUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-xs font-bold text-foreground"><FileImage className="size-4"/>View government ID</a> : null}{item.selfieUrl ? <a href={item.selfieUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-xs font-bold text-foreground"><FileImage className="size-4"/>View selfie</a> : null}</div><Textarea className="mt-4" placeholder="Review note or information request" value={notes[item.id] ?? item.admin_note ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}/><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => void act(item.id,"UNDER_REVIEW")}>Under review</Button><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => void act(item.id,"ADDITIONAL_INFORMATION_REQUIRED")}>Request information</Button><Button size="sm" disabled={busy === item.id} onClick={() => void act(item.id,"APPROVED")}><BadgeCheck className="size-4"/>Approve</Button><Button size="sm" variant="destructive" disabled={busy === item.id} onClick={() => void act(item.id,"REJECTED")}>Reject</Button></div></article>)}</div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-foreground">{value || "—"}</p></div>; }
