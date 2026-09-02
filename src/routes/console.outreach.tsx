import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Mail, MessageCircle, Search, XCircle } from "lucide-react";
import { getOutreachLog, logOutreach, lookupContact, sendOutreachEmail, type ContactCard } from "@/lib/outreach.functions";
import { OUTREACH_SCRIPTS, fillScript, type OutreachLang } from "@/lib/outreach-scripts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/outreach")({
  ssr: false,
  component: OutreachPage,
});

function OutreachPage() {
  const queryClient = useQueryClient();
  const lookup = useServerFn(lookupContact);
  const sendEmail = useServerFn(sendOutreachEmail);
  const logWhatsapp = useServerFn(logOutreach);
  const loadLog = useServerFn(getOutreachLog);

  const [query, setQuery] = useState("");
  const [contact, setContact] = useState<ContactCard | null>(null);
  const [searched, setSearched] = useState(false);
  const [scriptKey, setScriptKey] = useState("general");
  const [lang, setLang] = useState<OutreachLang>("en");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: log } = useQuery({ queryKey: ["console", "outreach-log"], queryFn: loadLog });

  function applyScript(key: string, language: OutreachLang, target: ContactCard | null) {
    const script = OUTREACH_SCRIPTS.find((s) => s.key === key) ?? OUTREACH_SCRIPTS[0]!;
    const values = {
      name: target?.fullName ?? "there",
      provider: target?.providerName ?? "your business",
      city: target?.city ?? "your city",
      amount: formatXAF(target?.walletAvailable ?? 0),
      agent: "ASH Glo Support",
      booking: "",
    };
    setScriptKey(key);
    setLang(language);
    setSubject(fillScript(script.subject[language], values));
    setMessage(fillScript(script.body[language], values));
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    const result = await lookup({ data: { query } });
    setContact(result.contact);
    setSearched(true);
    if (result.contact) applyScript(scriptKey, lang, result.contact);
  }

  const waNumber = (contact?.whatsapp || contact?.phone || "").replace(/[^\d]/g, "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">Direct outreach</h2>
        <p className="text-sm text-muted-foreground">
          Find any user by email or phone and reach them on branded email or WhatsApp in one click.
        </p>
      </div>

      <form onSubmit={search} className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="user@email.com or 6XXXXXXXX"
          className="max-w-sm"
        />
        <Button type="submit">
          <Search className="size-4" aria-hidden />
          Find user
        </Button>
      </form>

      {searched && !contact ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No account matches that email or phone. You can still email any address below.
        </p>
      ) : null}

      {contact ? (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name" value={contact.fullName} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone ?? "—"} />
          <Field label="Status" value={contact.accountStatus ?? "—"} />
          <Field label="Wallet available" value={formatXAF(contact.walletAvailable)} />
          <Field label="Total earned" value={formatXAF(contact.totalEarned)} />
          <Field label="Bookings" value={String(contact.bookingsCount)} />
          <Field
            label="Storefront"
            value={contact.providerName ? `${contact.providerName}${contact.providerVerified ? " ✓" : ""}` : "—"}
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
              value={scriptKey}
              onChange={(event) => applyScript(event.target.value, lang, contact)}
            >
              {OUTREACH_SCRIPTS.map((script) => (
                <option key={script.key} value={script.key}>
                  {script.group} — {script.label}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => applyScript(scriptKey, lang === "en" ? "fr" : "en", contact)}>
              {lang === "en" ? "Français" : "English"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outreach-to">Recipient email</Label>
            <Input
              id="outreach-to"
              value={contact?.email ?? query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outreach-subject">Subject</Label>
            <Input id="outreach-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outreach-message">Message</Label>
            <Textarea
              id="outreach-message"
              rows={12}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {status ? <p className="text-xs font-medium text-muted-foreground">{status}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || !message}
              onClick={async () => {
                setBusy(true);
                setStatus(null);
                const to = contact?.email ?? query;
                const result = await sendEmail({
                  data: {
                    to,
                    subject,
                    message,
                    templateKey: scriptKey,
                    userId: contact?.userId ?? null,
                    department: "Customer Support",
                  },
                });
                setBusy(false);
                setStatus(result.ok ? `Branded email sent to ${to}.` : `Could not send: ${result.error}`);
                queryClient.invalidateQueries({ queryKey: ["console", "outreach-log"] });
              }}
            >
              <Mail className="size-4" aria-hidden />
              {busy ? "Sending…" : "Send branded email"}
            </Button>

            <Button
              variant="outline"
              disabled={!waNumber || !message}
              onClick={async () => {
                window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
                await logWhatsapp({
                  data: {
                    channel: "WHATSAPP",
                    recipient: waNumber,
                    body: message,
                    templateKey: scriptKey,
                    userId: contact?.userId ?? null,
                  },
                });
                setStatus("WhatsApp opened and logged.");
                queryClient.invalidateQueries({ queryKey: ["console", "outreach-log"] });
              }}
            >
              <MessageCircle className="size-4" aria-hidden />
              Send on WhatsApp
            </Button>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground">Recent outreach</p>
          <ul className="mt-3 space-y-3">
            {(log ?? []).length === 0 ? (
              <li className="text-xs text-muted-foreground">Nothing sent yet.</li>
            ) : (
              (log ?? []).map((row) => (
                <li key={row.id} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    {row.delivered ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />
                    ) : (
                      <XCircle className="size-3.5 text-destructive" aria-hidden />
                    )}
                    <span className="truncate font-semibold text-foreground">{row.recipient}</span>
                    <Badge className="ml-auto rounded-full border-0 bg-muted text-[10px] text-muted-foreground">
                      {row.channel}
                    </Badge>
                  </div>
                  <p className="truncate text-muted-foreground">
                    {row.subject ?? row.template_key} · {row.staff_name}
                  </p>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
