import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/refer/states";
import {
  CAMPUS_CATEGORIES,
  useAllCampusCatalogue,
  useCampusCatalogueAdmin,
  type CampusCatalogueKind,
} from "@/lib/campus.queries";

export const Route = createFileRoute("/console/campus-catalogue")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Campus Catalogue — ASH Console" },
      { name: "description", content: "Private ASH Campus subject, language, exam and skill catalogue." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Campus Catalogue — ASH Console" },
      { property: "og:description", content: "Manage ASH Campus subjects, languages, exams and skills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampusCatalogue,
});

const KINDS: CampusCatalogueKind[] = ["SUBJECT", "LANGUAGE", "EXAM", "SKILL", "LEVEL"];

function CampusCatalogue() {
  const { data, isLoading } = useAllCampusCatalogue();
  const { add, setActive } = useCampusCatalogueAdmin();
  const [kind, setKind] = useState<CampusCatalogueKind>("EXAM");
  const [category, setCategory] = useState<string>("EXAM_PREPARATION");
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");

  if (isLoading) return <LoadingState label="Loading Campus catalogue…" />;

  async function create() {
    if (!nameEn.trim()) return;
    try {
      await add.mutateAsync({ category, kind, nameEn, nameFr });
      setNameEn("");
      setNameFr("");
      toast.success("Catalogue entry added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the entry.");
    }
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-extrabold text-foreground">Campus Catalogue</h2>
        <p className="text-sm text-muted-foreground">
          Subjects, languages, examinations, skills and education levels instructors can choose from. Adding an entry
          here makes it selectable in applications and in learner search — it never implies ASH is affiliated with an
          examination organisation.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex gap-3">
          <Library className="size-5 shrink-0 text-primary" />
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Kind
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as CampusCatalogueKind)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal normal-case text-foreground"
              >
                {KINDS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal normal-case text-foreground"
              >
                {CAMPUS_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="Name (English)" />
            <Input value={nameFr} onChange={(event) => setNameFr(event.target.value)} placeholder="Name (French)" />
          </div>
        </div>
        <Button className="mt-3" onClick={() => void create()} disabled={add.isPending}>
          Add entry
        </Button>
      </section>

      <div className="space-y-4">
        {KINDS.map((group) => {
          const items = rows.filter((row) => row.kind === group);
          if (!items.length) return null;
          return (
            <section key={group} className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 font-bold text-foreground">{group}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <span className="text-sm text-foreground">
                      {item.name_en}
                      <span className="text-muted-foreground"> · {item.name_fr} · {item.category}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{item.is_active ? "Active" : "Retired"}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setActive.mutate(
                            { id: item.id, isActive: !item.is_active },
                            { onError: (error) => toast.error(error instanceof Error ? error.message : "Failed.") },
                          )
                        }
                      >
                        {item.is_active ? "Retire" : "Restore"}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
