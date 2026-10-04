import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { createStaffSeat, listStaff, setStaffTargets, updateStaffSeat } from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState } from "@/components/refer/states";
import { StaffAuthenticationAudit } from "@/components/console/StaffAuthenticationAudit";

const DEPARTMENT_OPTIONS = [
  ["SUPPORT", "Support"],
  ["GROWTH", "Growth & Acquisition"],
  ["SALES", "Sales"],
  ["MARKETPLACE_OPS", "Marketplace Operations"],
  ["ADVERTISING", "Advertising"],
  ["PARTNERSHIPS", "Partnerships"],
  ["CONTENT", "Content & Creators"],
  ["MERCHANT", "Merchants"],
  ["EXPANSION", "Expansion"],
  ["REVENUE", "Revenue"],
  ["TRUST", "Trust & Verification"],
  ["SUPER_ADMIN", "Super admin"],
] as const;

export const Route = createFileRoute("/console/staff")({
  ssr: false,
  head: () => ({ meta: [
    { title: "ASH Glo — Private Staff Administration & Authentication Audit" },
    { name: "description", content: "Private ASH Glo staff account, department and authentication audit." },
    { property: "og:title", content: "ASH Glo — Private Staff Administration" },
    { property: "og:description", content: "Private staff department and authentication audit." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(listStaff);
  const update = useServerFn(updateStaffSeat);
  const targets = useServerFn(setStaffTargets);
  const { data, isLoading, error } = useQuery({ queryKey: ["console", "staff"], queryFn: load });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["console", "staff"] });

  if (isLoading) return <LoadingState label="Loading staff seats…" />;
  if (error) {
    return (
      <p className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        Only the super admin can manage staff accounts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground">Staff & departments</h2>
          <p className="text-sm text-muted-foreground">
            Each seat signs in with its own username. Everyone can read the console; only their own
            department can make changes.
          </p>
        </div>
        <NewSeat onDone={refresh} />
      </div>

      <div className="space-y-3">
        {(data ?? []).map((seat) => (
          <div key={seat.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{seat.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  @{seat.username} · {seat.email ?? "no email"} ·{" "}
                  {seat.last_login_at ? `last login ${new Date(seat.last_login_at).toLocaleString()}` : "never signed in"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full border-0 bg-primary/10 text-primary">{seat.department}</Badge>
                {seat.is_active ? null : <Badge variant="destructive">Disabled</Badge>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                value={seat.department}
                onChange={async (event) => {
                  await update({ data: { id: seat.id, department: event.target.value } });
                  refresh();
                }}
              >
                {DEPARTMENT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await update({ data: { id: seat.id, isActive: !seat.is_active } });
                  refresh();
                }}
              >
                {seat.is_active ? "Disable" : "Enable"}
              </Button>

              <ResetPassword id={seat.id} onDone={refresh} />
              <TargetsDialog
                seat={seat}
                onSave={async (values) => {
                  await targets({ data: { staffId: seat.id, ...values } });
                  refresh();
                }}
              />
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No staff seats yet. Create the first one above.
          </p>
        ) : null}
      </div>
      <StaffAuthenticationAudit />
    </div>
  );
}

function NewSeat({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createStaffSeat);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    department: "SUPPORT",
    email: "",
    phone: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          New staff seat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create staff login</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const result = await create({ data: form });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setForm({ fullName: "", username: "", password: "", department: "SUPPORT", email: "", phone: "" });
            setOpen(false);
            onDone();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Full name</Label>
              <Input
                id="staff-name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-username">Username</Label>
              <Input
                id="staff-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-dept">Department</Label>
            <select
              id="staff-dept"
              className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              {DEPARTMENT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Password (8+ characters)</Label>
            <Input
              id="staff-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            <ShieldCheck className="size-4" aria-hidden />
            Create seat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPassword({ id, onDone }: { id: string; onDone: () => void }) {
  const update = useServerFn(updateStaffSeat);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <KeyRound className="size-4" aria-hidden />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" />
          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            onClick={async () => {
              const result = await update({ data: { id, password } });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setPassword("");
              setOpen(false);
              onDone();
            }}
          >
            Save password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TargetsDialog({
  seat,
  onSave,
}: {
  seat: { id: string; full_name: string; targets: { contacts_target: number; recruits_target: number; deals_target: number; revenue_target: number } | null };
  onSave: (values: { contacts: number; recruits: number; deals: number; revenue: number }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    contacts: seat.targets?.contacts_target ?? 30,
    recruits: seat.targets?.recruits_target ?? 15,
    deals: seat.targets?.deals_target ?? 5,
    revenue: seat.targets?.revenue_target ?? 0,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Daily targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Daily targets — {seat.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {([
            ["contacts", "Businesses contacted"],
            ["recruits", "Providers recruited"],
            ["deals", "Deals closed"],
            ["revenue", "Revenue target (XAF)"],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`t-${key}`}>{label}</Label>
              <Input
                id={`t-${key}`}
                type="number"
                min={0}
                value={values[key]}
                onChange={(e) => setValues({ ...values, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
          <Button
            className="w-full"
            onClick={async () => {
              await onSave(values);
              setOpen(false);
            }}
          >
            Save targets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
