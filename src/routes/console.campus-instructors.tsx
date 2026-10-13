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
import {
  decideCampusInstructorApplication,
  listCampusInstructorApplications,
} from "@/lib/campus-admin.functions";

export const Route = createFileRoute("/console/campus-instructors")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Campus Instructor Reviews — ASH Console" },
      { name: "description", content: "Private ASH Campus instructor application review queue." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Campus Instructor Reviews — ASH Console" },
      {
        property: "og:description",
        content: "Private ASH Campus instructor application review queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampusInstructorReviews,
});

type Decision = "UNDER_REVIEW" | "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

function CampusInstructorReviews() {
  const load = useServerFn(listCampusInstructorApplications);
  const decide = useServerFn(decideCampusInstructorApplication);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["console", "campus-instructor-applications"],
    queryFn: load,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Loading Campus instructor applications…" />;

  async function act(id: string, status: Decision) {
    setBusy(id);
    try {
      const note = notes[id];
      await decide({
        data: note ? { applicationId: id, status, note } : { applicationId: id, status },
      });
      toast.success(`Application marked ${status.toLowerCase().replaceAll("_", " ")}.`);
      await queryClient.invalidateQueries({
        queryKey: ["console", "campus-instructor-applications"],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the application.");
    } finally {
      setBusy(null);
    }
  }

  const rows = (data ?? []) as Record<string, any>[];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-extrabold text-foreground">
          Campus Instructor Reviews
        </h2>
        <p className="text-sm text-muted-foreground">
          Manual ASH review. Approving creates the public instructor profile and the ASH Verified
          Instructor label.
        </p>
      </header>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex gap-3">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Check the identity and qualification documents, record a clear reason, and approve only
            genuine educational professionals. ASH does not perform criminal background checks or
            licensing checks — never describe an instructor that way.
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {!rows.length ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No applications yet.
          </p>
        ) : (
          rows.map((item) => (
            <article key={item["id"]} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground">{item["legal_full_name"]}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item["display_name"]} · {item["country"]}
                    {item["city"] ? ` · ${item["city"]}` : ""} · {item["years_experience"]} years
                  </p>
                </div>
                <Badge variant="outline">{String(item["status"]).replaceAll("_", " ")}</Badge>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Headline" value={item["headline"]} />
                <Info label="About" value={item["bio"]} />
                <Info label="Instructor type" value={(item["instructor_types"] ?? []).join(", ")} />
                <Info label="Subjects" value={(item["subjects"] ?? []).join(", ")} />
                <Info label="Exams prepared" value={(item["exams"] ?? []).join(", ")} />
                <Info label="Skills" value={(item["skills"] ?? []).join(", ")} />
                <Info label="Time zone" value={item["timezone"]} />
                <Info label="Levels" value={(item["levels"] ?? []).join(", ")} />
                <Info label="Languages" value={(item["languages"] ?? []).join(", ")} />
                <Info label="Teaching modes" value={(item["teaching_modes"] ?? []).join(", ")} />
                <Info label="Teaching experience" value={item["teaching_experience"]} />
                <Info label="Methodology" value={item["methodology"]} />
                <Info
                  label="Qualifications"
                  value={(item["qualifications"] ?? [])
                    .map((q: { title?: string; institution?: string; year?: string }) =>
                      [q.title, q.institution, q.year].filter(Boolean).join(" · "),
                    )
                    .join("\n")}
                />
                <Info label="Date of birth" value={item["date_of_birth"]} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {item["identityUrl"] ? (
                  <a
                    href={item["identityUrl"]}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-xs font-bold text-foreground"
                  >
                    <FileImage className="size-4" />
                    View identity document
                  </a>
                ) : null}
                {item["qualificationUrl"] ? (
                  <a
                    href={item["qualificationUrl"]}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-xs font-bold text-foreground"
                  >
                    <FileImage className="size-4" />
                    View qualification document
                  </a>
                ) : null}
              </div>
              <Textarea
                className="mt-4"
                placeholder="Review note or information request"
                value={notes[item["id"]] ?? item["admin_note"] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [item["id"]]: event.target.value }))
                }
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === item["id"]}
                  onClick={() => void act(item["id"], "UNDER_REVIEW")}
                >
                  Under review
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === item["id"]}
                  onClick={() => void act(item["id"], "ADDITIONAL_INFORMATION_REQUIRED")}
                >
                  Request information
                </Button>
                <Button
                  size="sm"
                  disabled={busy === item["id"]}
                  onClick={() => void act(item["id"], "APPROVED")}
                >
                  <BadgeCheck className="size-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === item["id"]}
                  onClick={() => void act(item["id"], "REJECTED")}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-foreground">{String(value)}</p>
    </div>
  );
}
