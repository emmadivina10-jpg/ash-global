import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyTraining, listSecurityBulletins, submitTraining } from "@/lib/cyber-control.functions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/console/security-updates")({
  head: () => ({ meta: [{ title: "Security updates — ASH Console" }, { name: "robots", content: "noindex" }] }),
  component: SecurityUpdates,
});

function SecurityUpdates() {
  const list = useServerFn(listSecurityBulletins);
  const mine = useServerFn(getMyTraining);
  const submit = useServerFn(submitTraining);
  const b = useQuery({ queryKey: ["staff", "bulletins"], queryFn: () => list() });
  const t = useQuery({ queryKey: ["staff", "training"], queryFn: () => mine() });
  const [answers, setAnswers] = useState<number[]>([]);
  const tr = t.data?.training;
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold">Security updates</h1>
        {(b.data?.bulletins ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No security updates.</p> : null}
        {(b.data?.bulletins ?? []).map((x) => (
          <article key={x.id} className="rounded-3xl border border-border bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{x.severity} · {formatDateTime(x.created_at)} · ASH Cybersecurity</p>
            <h2 className="text-lg font-bold">{x.title}</h2>
            <p className="whitespace-pre-wrap text-sm">{x.body}</p>
          </article>
        ))}
      </section>
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-bold">Security awareness training</h2>
        <p className="mb-3 text-xs text-muted-foreground">Required every 6 months. {t.data?.lastCompleted ? `Last passed ${formatDateTime(t.data.lastCompleted)}.` : "Not completed yet."} {t.data?.overdue ? "Due now." : ""}</p>
        {!tr ? <p className="text-sm">No training published yet.</p> : (
          <div className="space-y-4">
            <h3 className="font-semibold">{tr.title}</h3>
            {(tr.lessons as { heading: string; body: string }[]).map((l, i) => <div key={i}><p className="font-semibold">{l.heading}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{l.body}</p></div>)}
            <div className="space-y-3">
              {tr.quiz.map((q, i) => (
                <fieldset key={i} className="text-sm"><legend className="font-semibold">{i + 1}. {q.q}</legend>
                  {q.options.map((o, j) => <label key={j} className="flex gap-2"><input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers((a) => { const n = [...a]; n[i] = j; return n; })} />{o}</label>)}
                </fieldset>
              ))}
            </div>
            {t.data?.canTake ? <Button onClick={async () => { const r = await submit({ data: { trainingId: tr.id, answers } }); toast[r.passed ? "success" : "error"](`Score ${r.score}% — ${r.passed ? "passed" : "try again"}`); await t.refetch(); }}>Submit answers</Button> : <p className="text-xs text-muted-foreground">Shared team logins cannot record completion; use your personal login.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
