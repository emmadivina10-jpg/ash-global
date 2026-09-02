import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROPERTY_STATUSES, VERIFICATION_STATES, categoryLabel, formatPropertyPrice } from "@/lib/property";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/console/property")({
  ssr: false,
  component: ConsoleProperty,
});

type Row = {
  id: string;
  title: string;
  category: string;
  status: string;
  verification_status: string;
  city: string;
  country: string;
  price: number;
  currency: string;
  price_period: string | null;
  owner_id: string;
  owner_name: string | null;
  contact_phone: string | null;
  view_count: number;
  inquiry_count: number;
  created_at: string;
  expires_at: string;
};

function ConsoleProperty() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("PENDING_REVIEW");

  const { data, isLoading } = useQuery({
    queryKey: ["console", "property", filter],
    queryFn: async (): Promise<Row[]> => {
      let query = supabase
        .from("property_listings")
        .select(
          "id, title, category, status, verification_status, city, country, price, currency, price_period, owner_id, owner_name, contact_phone, view_count, inquiry_count, created_at, expires_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "ALL") query = query.eq("status", filter);
      const { data: rows, error } = await query;
      if (error) throw error;
      return (rows ?? []) as unknown as Row[];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["console", "property-reports"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("content_reports")
        .select("id, target_id, reason, details, status, created_at")
        .eq("target_type", "PROPERTY")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return rows ?? [];
    },
  });

  async function patch(id: string, values: { status?: string; verification_status?: string }) {
    const { error } = await supabase.from("property_listings").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["console", "property"] });
    toast.success("Listing updated.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-foreground">
          <Building2 className="size-5" aria-hidden />
          ASH Property
        </h2>
        <p className="text-sm text-muted-foreground">
          Review adverts, set the verification level shown to renters and act on fraud reports. Never mark a listing
          verified without real evidence.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["PENDING_REVIEW", "ACTIVE", "REJECTED", "EXPIRED", "ALL"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === key ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState label="Loading listings…" />
      ) : (data?.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Nothing in this queue.
        </p>
      ) : (
        <div className="space-y-3">
          {data?.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(row.category, false)} · {row.city}, {row.country} ·{" "}
                    {formatPropertyPrice(row.price, row.currency, row.price_period, false)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.owner_name ?? "—"} · {row.contact_phone ?? "no phone"} · {row.view_count} views ·{" "}
                    {row.inquiry_count} inquiries · created {formatDateTime(row.created_at)}
                  </p>
                </div>
                <Badge className="rounded-full border-0 bg-muted text-[10px] text-muted-foreground">{row.status}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={row.status}
                  onChange={(event) => void patch(row.id, { status: event.target.value })}
                  className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
                  aria-label="Listing status"
                >
                  {PROPERTY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={row.verification_status}
                  onChange={(event) => void patch(row.id, { verification_status: event.target.value })}
                  className="h-9 rounded-xl border border-border bg-background px-2 text-xs"
                  aria-label="Verification level"
                >
                  {VERIFICATION_STATES.map((level) => (
                    <option key={level.code} value={level.code}>
                      {level.en}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={() => void patch(row.id, { status: "ACTIVE" })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => void patch(row.id, { status: "REJECTED" })}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Property fraud reports</p>
        <ul className="mt-3 space-y-2">
          {(reports?.length ?? 0) === 0 ? (
            <li className="text-xs text-muted-foreground">No property reports.</li>
          ) : (
            reports?.map((report) => (
              <li key={report.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="text-foreground">
                  {report.reason} — <span className="text-xs text-muted-foreground">{report.status}</span>
                </p>
                {report.details ? <p className="text-xs text-muted-foreground">{report.details}</p> : null}
                <p className="text-[11px] text-muted-foreground">
                  Listing {report.target_id} · {formatDateTime(report.created_at)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
