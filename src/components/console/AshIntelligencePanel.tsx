import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Loader2, Send } from "lucide-react";
import { askAshIntelligence } from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = ["How am I performing?", "What should I prioritize?", "What tickets need attention?"];

/** ASH Intelligence — evidence-based assistant scoped to the employee's department. */
export function AshIntelligencePanel({ superAdmin }: { superAdmin: boolean }) {
  const ask = useServerFn(askAshIntelligence);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const submit = useMutation({
    mutationFn: async (q: string) => ask({ data: { question: q } }),
    onSuccess: (res, q) => {
      setHistory((h) => [{ q, a: res.answer }, ...h].slice(0, 10));
      setQuestion("");
    },
  });

  const suggestions = superAdmin
    ? [...SUGGESTIONS, "Compare departments", "Who needs attention?"]
    : SUGGESTIONS;

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold">ASH Intelligence</h2>
          <p className="text-[11px] text-muted-foreground">Answers from real ASH data, scoped to your access.</p>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit.mutate(s)}
            disabled={submit.isPending}
            className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs transition hover:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) submit.mutate(question.trim());
        }}
      >
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask ASH Intelligence…" />
        <Button type="submit" size="icon" disabled={submit.isPending || !question.trim()}>
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <div className="mt-4 space-y-3">
        {history.map((h, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-background/60 p-3">
            <p className="text-xs font-semibold text-muted-foreground">{h.q}</p>
            <p className="mt-1 text-sm leading-relaxed">{h.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
