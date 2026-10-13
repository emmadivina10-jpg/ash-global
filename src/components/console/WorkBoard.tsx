import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone, Plus, RefreshCw, Target, Trophy } from "lucide-react";
import {
  getWorkBoard,
  logLeadActivity,
  moveLeadStage,
  saveLead,
  LEAD_STAGES,
  type Lead,
} from "@/lib/workforce.functions";
import { logOutreach } from "@/lib/outreach.functions";
import { OUTREACH_SCRIPTS, fillScript } from "@/lib/outreach-scripts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/refer/states";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<string, string> = {
  NEW: "bg-muted text-muted-foreground",
  CONTACTED: "bg-primary/10 text-primary",
  INTERESTED: "bg-gold/15 text-gold-foreground",
  DEMO: "bg-primary/15 text-primary",
  REGISTERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  PAID: "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300",
  LOST: "bg-destructive/10 text-destructive",
};

export function WorkBoard({
  department,
  title,
  blurb,
  leadType = "BUSINESS",
}: {
  department: string;
  title: string;
  blurb: string;
  leadType?: string;
}) {
  const queryClient = useQueryClient();
  const board = useServerFn(getWorkBoard);
  const { data, isLoading } = useQuery({
    queryKey: ["console", "workboard", department],
    queryFn: () => board({ data: { department } }),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["console", "workboard", department] });

  if (isLoading) return <LoadingState label="Loading your work board…" />;
  if (!data) return null;

  const targets = data.targets;
  const canWrite = data.canWrite;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
          {canWrite ? (
            <LeadDialog department={department} leadType={leadType} onDone={refresh} />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Contacted today"
          value={data.today.contacts}
          target={targets?.contacts_target}
        />
        <Metric
          label="Recruited today"
          value={data.today.recruits}
          target={targets?.recruits_target}
        />
        <Metric label="Deals closed" value={data.today.deals} target={targets?.deals_target} />
        <Metric label="Activities logged" value={data.today.activities} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {LEAD_STAGES.map((stage) => (
          <div key={stage} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stage}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">
              {data.pipeline[stage] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          {data.leads.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No leads yet. Add your first lead to start working the queue.
            </p>
          ) : (
            data.leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} canWrite={canWrite} onDone={refresh} />
            ))
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Trophy className="size-4 text-gold" aria-hidden />
            Today's leaderboard
          </p>
          <ul className="mt-3 space-y-2">
            {data.leaderboard.length === 0 ? (
              <li className="text-xs text-muted-foreground">No activity logged yet today.</li>
            ) : (
              data.leaderboard.map((row, index) => (
                <li key={row.name} className="flex items-center justify-between text-sm">
                  <span className="truncate text-foreground">
                    {index + 1}. {row.name}
                  </span>
                  <span className="font-bold text-primary">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target?: number | undefined;
}) {
  const pct = target ? Math.min(100, Math.round((value / Math.max(1, target)) * 100)) : null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-foreground">
        {value}
        {target ? <span className="text-base text-muted-foreground"> / {target}</span> : null}
      </p>
      {pct !== null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Target className="size-3" aria-hidden /> no target set
        </p>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  canWrite,
  onDone,
}: {
  lead: Lead;
  canWrite: boolean;
  onDone: () => void;
}) {
  const move = useServerFn(moveLeadStage);
  const logActivity = useServerFn(logLeadActivity);
  const logReach = useServerFn(logOutreach);
  const [open, setOpen] = useState(false);
  const [scriptKey, setScriptKey] = useState("provider-recruit");
  const [lang, setLang] = useState<"en" | "fr">("en");

  const script = OUTREACH_SCRIPTS.find((s) => s.key === scriptKey) ?? OUTREACH_SCRIPTS[0]!;
  const message = fillScript(script.body[lang], {
    name: lead.name,
    city: lead.city ?? "your city",
    agent: "ASH Glo",
  });
  const waNumber = (lead.whatsapp || lead.phone || "").replace(/[^\d]/g, "");

  const stageMutation = useMutation({
    mutationFn: (stage: string) => move({ data: { id: lead.id, stage: stage as never } }),
    onSuccess: onDone,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{lead.name}</p>
          <p className="text-xs text-muted-foreground">
            {[lead.category, lead.city, lead.source].filter(Boolean).join(" · ") || "No details"}
          </p>
        </div>
        <Badge className={cn("rounded-full border-0", STAGE_TONE[lead.stage] ?? "")}>
          {lead.stage}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {waNumber ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              window.open(
                `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
                "_blank",
              );
              await logReach({
                data: {
                  channel: "WHATSAPP",
                  recipient: waNumber,
                  body: message,
                  leadId: lead.id,
                  templateKey: script.key,
                },
              });
              await logActivity({
                data: { id: lead.id, kind: "CONTACT", body: `WhatsApp: ${script.label}` },
              });
              onDone();
            }}
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </Button>
        ) : null}
        {lead.phone ? (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${lead.phone}`}>
              <Phone className="size-4" aria-hidden />
              Call
            </a>
          </Button>
        ) : null}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Outreach script — {lead.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
                  value={scriptKey}
                  onChange={(event) => setScriptKey(event.target.value)}
                >
                  {OUTREACH_SCRIPTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLang(lang === "en" ? "fr" : "en")}
                >
                  {lang.toUpperCase()}
                </Button>
              </div>
              <Textarea readOnly value={message} rows={10} />
              <Button
                className="w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(message);
                  setOpen(false);
                }}
              >
                Copy script
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {canWrite ? (
          <select
            className="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-sm"
            value={lead.stage}
            onChange={(event) => stageMutation.mutate(event.target.value)}
          >
            {LEAD_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

function LeadDialog({
  department,
  leadType,
  onDone,
}: {
  department: string;
  leadType: string;
  onDone: () => void;
}) {
  const create = useServerFn(saveLead);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    city: "",
    phone: "",
    email: "",
    source: "",
    notes: "",
  });

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Add lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const result = await create({
              data: {
                name: form.name,
                leadType,
                department,
                category: form.category,
                city: form.city,
                phone: form.phone,
                whatsapp: form.phone,
                email: form.email,
                source: form.source,
                notes: form.notes,
              },
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setForm({
              name: "",
              category: "",
              city: "",
              phone: "",
              email: "",
              source: "",
              notes: "",
            });
            setOpen(false);
            onDone();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" value={form.name} onChange={set("name")} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-category">Category</Label>
              <Input id="lead-category" value={form.category} onChange={set("category")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-city">City</Label>
              <Input id="lead-city" value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone / WhatsApp</Label>
              <Input id="lead-phone" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={set("email")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-source">Source</Label>
            <Input
              id="lead-source"
              value={form.source}
              onChange={set("source")}
              placeholder="Facebook, walk-in…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-notes">Notes</Label>
            <Textarea id="lead-notes" value={form.notes} onChange={set("notes")} rows={3} />
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            Save lead
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
