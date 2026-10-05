import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2 } from "lucide-react";
import { confirmIdentity, getMyWorkspace } from "@/lib/workspace.functions";
import { Button } from "@/components/ui/button";

const SKIP_KEY = "ash-console-identity-skip";

/** Shown once per browser session after login: confirm or skip. No biometrics. */
export function IdentityConfirmation({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const load = useServerFn(getMyWorkspace);
  const confirm = useServerFn(confirmIdentity);
  const [skipped, setSkipped] = useState(true);
  useEffect(() => setSkipped(sessionStorage.getItem(SKIP_KEY) === "1"), []);

  const { data } = useQuery({ queryKey: ["console", "workspace"], queryFn: () => load() });
  const done = useMutation({
    mutationFn: () => confirm(),
    onSuccess: () => {
      sessionStorage.setItem(SKIP_KEY, "1");
      setSkipped(true);
      qc.invalidateQueries({ queryKey: ["console", "workspace"] });
    },
  });

  const me = data?.me;
  if (skipped || !me) return <>{children}</>;
  const name = me.employee_name ?? me.full_name;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confirm your identity</p>
        <div className="mx-auto mt-6 grid size-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-gold text-3xl font-bold text-primary-foreground ring-4 ring-gold/30">
          {me.avatar_url ? <img src={me.avatar_url} alt={name} className="size-full object-cover" /> : name.slice(0, 1)}
        </div>
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        <p className="text-sm text-muted-foreground">{me.position ?? "Position not set"}</p>
        <div className="mt-4 space-y-1 rounded-2xl bg-background/60 p-3 text-sm">
          <p><span className="text-muted-foreground">Department:</span> {me.department}</p>
          <p><span className="text-muted-foreground">Employee ID:</span> {me.employee_id ?? "Not assigned"}</p>
        </div>
        <Button className="mt-6 w-full" onClick={() => done.mutate()} disabled={done.isPending}>
          {done.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BadgeCheck className="mr-2 size-4" />}
          This is me
        </Button>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => {
            sessionStorage.setItem(SKIP_KEY, "1");
            setSkipped(true);
          }}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}
