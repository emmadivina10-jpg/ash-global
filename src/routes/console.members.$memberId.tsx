import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStaffMemberReview, getStaffMemberAIThread } from "@/lib/member-insights.functions";
import { MemberAIAssistant } from "@/components/console/MemberAIAssistant";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ShieldCheck } from "lucide-react";
export const Route = createFileRoute("/console/members/$memberId")({
  head: () => ({
    meta: [
      { title: "Member Review | ASH Glo Console" },
      {
        name: "description",
        content: "Authorized ASH Glo staff member review and account assistance.",
      },
      { property: "og:title", content: "Member Review | ASH Glo Console" },
      { property: "og:description", content: "Private authorized member review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MemberReviewPage,
});
function MemberReviewPage() {
  const { memberId } = Route.useParams();
  const review = useServerFn(getStaffMemberReview);
  const history = useServerFn(getStaffMemberAIThread);
  const [section, setSection] = useState("bookings");
  const [page, setPage] = useState(0);
  const records = useQuery({
    queryKey: ["console", "member-review", memberId, section, page],
    queryFn: () => review({ data: { userId: memberId, section, page } }),
    retry: false,
  });
  const thread = useQuery({
    queryKey: ["console", "member-ai", memberId],
    queryFn: () => history({ data: { userId: memberId } }),
    enabled: Boolean(records.data),
    retry: false,
  });
  if (records.isError)
    return (
      <p role="alert">Account review is unavailable or your department does not have permission.</p>
    );
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/console/workspace">
          <ArrowLeft />
          Workspace
        </Link>
      </Button>
      <header>
        <h1 className="text-xl font-bold">{records.data?.profile.full_name ?? "Member review"}</h1>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Staff review · no member sign-in · access recorded
        </p>
      </header>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span>{records.data?.profile.account_status}</span>
            <span>{records.data?.profile.verified_tier}</span>
          </div>
          <Tabs
            value={section}
            onValueChange={(s) => {
              setSection(s);
              setPage(0);
            }}
          >
            <TabsList className="h-auto max-w-full flex-wrap">
              {["bookings", "transactions", "support", "posts", "referrals"].map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {records.isPending ? (
            <p>Loading account records…</p>
          ) : records.data?.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded {section}.</p>
          ) : (
            <ul className="divide-y divide-border">
              {records.data?.rows.map((row) => (
                <li key={String(row["id"])} className="space-y-1 py-3">
                  {Object.entries(row)
                    .filter(([key, value]) => key !== "id" && value !== null)
                    .map(([key, value]) => (
                      <p key={key} className="break-words text-sm">
                        <span className="text-muted-foreground">{key.replaceAll("_", " ")}: </span>
                        {String(value)}
                      </p>
                    ))}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {records.data?.total ?? "—"} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!records.data || (page + 1) * 25 >= records.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {records.data?.superAdmin || records.data?.department === "SUPPORT" ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/console/support" search={{ ticket: undefined }}>
                  Support actions
                </Link>
              </Button>
            ) : null}
            {records.data?.superAdmin || records.data?.department === "TRUST" ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/console/trust">Trust &amp; Safety actions</Link>
              </Button>
            ) : null}
            {records.data?.superAdmin || records.data?.department === "REVENUE" ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/console/finance">Finance actions</Link>
              </Button>
            ) : null}
          </div>
        </section>
        {thread.data ? (
          <MemberAIAssistant
            key={thread.data.id}
            userId={memberId}
            threadId={thread.data.id}
            initialMessages={JSON.parse(thread.data.messagesJson)}
          />
        ) : (
          <aside className="rounded-lg border border-border p-5">
            <h2 className="font-semibold">ASH Intelligence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {thread.isError
                ? "Secure account assistance is awaiting approval of the staff insights update."
                : "Loading secure account assistance…"}
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
