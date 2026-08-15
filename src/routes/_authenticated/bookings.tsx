import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyBookings, useMyProviderProfile, useProviderBookings } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { RatingStars } from "@/components/refer/RatingStars";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BOOKING_STATUS_KEY, type BookingStatus } from "@/lib/marketplace";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Bookings — ASH Refer" },
      { name: "description", content: "Track the appointments you booked and the clients booking your studio." },
      { property: "og:title", content: "Bookings — ASH Refer" },
      { property: "og:description", content: "Manage beauty appointments and client requests in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingsPage,
});

function StatusPill({ status }: { status: BookingStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "COMPLETED" && "bg-primary/10 text-primary",
        status === "CONFIRMED" && "bg-gold/15 text-gold-foreground",
        status === "PENDING" && "bg-muted text-muted-foreground",
        (status === "CANCELLED" || status === "DECLINED") && "bg-destructive/10 text-destructive",
      )}
    >
      {t(BOOKING_STATUS_KEY[status] ?? "booking.status.PENDING")}
    </span>
  );
}

function BookingsPage() {
  const { t } = useI18n();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: mine, isLoading } = useMyBookings();
  const { data: studio } = useMyProviderProfile();
  const { data: received } = useProviderBookings(studio?.id);

  async function setStatus(id: string, status: BookingStatus) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error(t("book.err"));
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("book.mine")}</h1>
      </header>

      <SectionCard title={t("book.mine")}>
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : (mine ?? []).length === 0 ? (
          <EmptyState title={t("book.none")} icon={<CalendarDays className="size-5" aria-hidden />} />
        ) : (
          <ul className="divide-y divide-border">
            {(mine ?? []).map((b) => (
              <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{b.service_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.provider?.business_name} · {formatDateTime(b.scheduled_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-semibold">{formatXAF(b.price)}</span>
                  <StatusPill status={b.status as BookingStatus} />
                  {b.status === "COMPLETED" ? <ReviewDialog bookingId={b.id} providerId={b.provider_id} /> : null}
                  {b.status === "PENDING" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "CANCELLED")}>
                      {t("book.cancel")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {studio ? (
        <SectionCard title={t("book.received")}>
          {(received ?? []).length === 0 ? (
            <EmptyState title={t("book.none")} icon={<CalendarDays className="size-5" aria-hidden />} />
          ) : (
            <ul className="divide-y divide-border">
              {(received ?? []).map((b) => (
                <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{b.service_title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(b.scheduled_at)}</p>
                    {b.notes ? <p className="mt-1 text-xs text-muted-foreground">{b.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="tabular text-sm font-semibold">{formatXAF(b.price)}</span>
                    <StatusPill status={b.status as BookingStatus} />
                    {b.status === "PENDING" ? (
                      <>
                        <Button size="sm" onClick={() => setStatus(b.id, "CONFIRMED")}>
                          {t("book.accept")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(b.id, "DECLINED")}>
                          {t("book.decline")}
                        </Button>
                      </>
                    ) : null}
                    {b.status === "CONFIRMED" ? (
                      <Button size="sm" onClick={() => setStatus(b.id, "COMPLETED")}>
                        {t("book.complete")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}
    </div>
  );

  function ReviewDialog({ bookingId, providerId }: { bookingId: string; providerId: string }) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    async function submit(event: React.FormEvent) {
      event.preventDefault();
      if (!user) return;
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        provider_id: providerId,
        client_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) {
        toast.error(t("book.reviewErr"));
        return;
      }
      toast.success(t("book.reviewSent"));
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["reviews", providerId] });
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            {t("book.review")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("book.review")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <RatingStars value={rating} size={26} onChange={setRating} />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("book.comment")}
              rows={3}
            />
            <Button type="submit" className="w-full">
              {t("book.submitReview")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
}
