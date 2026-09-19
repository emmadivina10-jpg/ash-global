import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PostCard } from "@/components/refer/PostCard";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { useFxInstructorProfile, useInstructorFollowState, useInstructorMarketUpdates, useToggleInstructorFollow } from "@/lib/market-ecosystem.queries";

export const Route = createFileRoute("/_authenticated/markets/instructors/$instructorId")({
  head: () => ({ meta: [{ title: "FX Instructor — ASH Markets" }, { name: "description", content: "Professional ASH Verified FX Instructor profile and educational market updates." }, { property: "og:title", content: "FX Instructor — ASH Markets" }, { property: "og:description", content: "Professional instructor profile and educational updates." }, { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary" }] }),
  component: InstructorProfilePage,
});

function InstructorProfilePage() {
  const { instructorId } = Route.useParams();
  const { data: instructor, isLoading } = useFxInstructorProfile(instructorId);
  const { data: updates } = useInstructorMarketUpdates(instructorId);
  const { data: following } = useInstructorFollowState(instructorId);
  const follow = useToggleInstructorFollow();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  return <div className="mx-auto w-full max-w-3xl pb-8"><Button asChild variant="ghost"><Link to="/search"><ArrowLeft className="size-4"/>FX Analytics</Link></Button>{isLoading ? <Loader2 className="mx-auto mt-20 size-6 animate-spin text-primary"/> : instructor ? <><header className="mt-5 border-y border-border py-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><Avatar path={instructor.avatar_url} name={instructor.full_name} online={instructor.online} className="size-24" hasUpdate/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-extrabold text-foreground">{instructor.full_name}</h1><VerifiedBadge tier={instructor.verified_tier} until={instructor.verified_until} size={18}/><span className="text-[9px] font-extrabold uppercase text-primary">ASH Verified FX Instructor</span></div><p className="mt-1 text-sm text-muted-foreground">@{instructor.username ?? "profile"} · {instructor.follower_count} followers</p><p className="mt-4 text-sm leading-relaxed text-muted-foreground">{instructor.about || "Professional FX educator on ASH."}</p></div>{me !== instructor.user_id ? <Button disabled={follow.isPending} onClick={() => follow.mutate({ instructorId, following: Boolean(following) }, { onError: () => toast.error("Could not update follow.") })}><UserPlus className="size-4"/>{following ? "Following" : "Follow"}</Button> : null}</div><div className="mt-5 border-t border-border pt-4"><p className="text-[10px] font-bold uppercase text-muted-foreground">Experience</p><p className="mt-1 text-sm text-foreground">{instructor.experience_summary || "Professional experience reviewed by ASH."}</p><div className="mt-3 flex flex-wrap gap-2">{instructor.specialties.map((item) => <span key={item} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">{item}</span>)}</div></div></header><section className="mt-7"><h2 className="font-display text-xl font-extrabold text-foreground">Educational Posts & Analysis</h2><div className="mt-3 space-y-4">{updates?.length ? updates.map((item) => <div key={item.id} className="overflow-hidden border-y border-border"><div className="bg-muted px-4 py-3"><p className="text-[10px] font-bold uppercase text-primary">{item.content_type.replaceAll("_", " ")}</p><p className="font-bold text-foreground">{item.title}</p></div><PostCard post={item.post} currentUserId={me}/></div>) : <p className="border-y border-border p-6 text-center text-sm text-muted-foreground">No Market updates published yet.</p>}</div></section></> : <p className="py-20 text-center text-muted-foreground">This approved instructor profile is unavailable.</p>}</div>;
}