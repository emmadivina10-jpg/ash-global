import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ScrollText } from "lucide-react";
import { acceptEmployeeTerms, getEmployeeTermsStatus } from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Blocks dashboard access until the employee accepts the current Employee Terms. */
export function EmployeeTermsGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getEmployeeTermsStatus);
  const accept = useServerFn(acceptEmployeeTerms);
  const [checked, setChecked] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["console", "terms"], queryFn: () => load() });

  const submit = useMutation({
    mutationFn: async () => accept(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["console", "terms"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || !data.required || data.accepted) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl border border-border/60 bg-card/70 p-8 shadow-xl backdrop-blur-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <ScrollText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold">ASH Employee Terms &amp; Conditions</h1>
        <p className="mt-1 text-xs text-muted-foreground">Version {data.version}</p>
        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-border/50 bg-background/60 p-4 text-sm leading-relaxed text-muted-foreground">
          <p>As an ASH employee you agree to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Keep all customer, financial, Trust &amp; Safety and internal company information strictly confidential.</li>
            <li>Access only the data and tools required for your assigned department and role.</li>
            <li>Never share your console login with anyone, inside or outside ASH.</li>
            <li>Handle customer tickets and reports professionally and within response targets.</li>
            <li>Never use ASH systems, data or customer contacts for personal purposes.</li>
            <li>Report security incidents, data breaches or policy violations immediately.</li>
            <li>Follow all ASH policies; violations may lead to suspension of access and disciplinary action.</li>
          </ul>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
          <span>I have read and agree to the ASH Employee Terms &amp; Conditions</span>
        </label>
        <Button className="mt-5 w-full" disabled={!checked || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
