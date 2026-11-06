import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { talentDb, TALENT_BUCKET } from "@/lib/musician.queries";
import { supabase } from "@/integrations/supabase/client";

export function MusicianReviews() {
  const cache = useQueryClient();
  const pending = useQuery({
    queryKey: ["musician-reviews"],
    queryFn: async () => {
      const [profiles, media] = await Promise.all([
        talentDb.from("musician_profiles").select("*").eq("review_status", "PENDING"),
        talentDb.from("musician_media").select("*").eq("review_status", "PENDING"),
      ]);
      if (profiles.error) throw profiles.error;
      if (media.error) throw media.error;
      const files = await Promise.all(
        media.data.map(async (item) => {
          const signed = await supabase.storage
            .from(TALENT_BUCKET)
            .createSignedUrl(item.object_path, 300);
          if (signed.error) throw signed.error;
          return { ...item, url: signed.data.signedUrl };
        }),
      );
      return { profiles: profiles.data, media: files };
    },
    staleTime: 180_000,
  });
  const review = useMutation({
    mutationFn: async (input: {
      kind: "PROFILE" | "MEDIA";
      id: string;
      status: "APPROVED" | "REJECTED";
    }) => {
      const result = await talentDb.rpc("review_musician_content", {
        _kind: input.kind,
        _id: input.id,
        _status: input.status,
      });
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["musician-reviews"] });
      toast.success("Review saved");
    },
    onError: (error) => toast.error(error.message),
  });
  const actions = (kind: "PROFILE" | "MEDIA", id: string) => (
    <div className="flex gap-2">
      {(["APPROVED", "REJECTED"] as const).map((status) => (
        <Button
          key={status}
          size="sm"
          variant="outline"
          disabled={review.isPending}
          onClick={() => review.mutate({ kind, id, status })}
        >
          {status === "APPROVED" ? "Approve" : "Reject"}
        </Button>
      ))}
    </div>
  );
  return (
    <section className="space-y-3 rounded-2xl border p-4">
      <h3 className="font-bold">Musician reviews</h3>
      {pending.isLoading ? (
        <p>Loading submissions…</p>
      ) : pending.isError ? (
        <p role="alert">Could not load submissions.</p>
      ) : null}
      {pending.data?.profiles.map((p) => (
        <article key={p.id} className="space-y-2 rounded-xl border p-3">
          <strong>{p.display_name}</strong>
          <p>
            {p.city}, {p.country} · {p.instruments.join(", ")}
          </p>
          <p>{p.biography}</p>
          <p>
            {p.experience} · {p.genres.join(", ")}
          </p>
          {actions("PROFILE", p.id)}
        </article>
      ))}
      {pending.data?.media.map((item) => (
        <article key={item.id} className="space-y-2 rounded-xl border p-3">
          <p>
            Musician {item.musician_id} · {item.media_type}
          </p>
          {item.media_type === "PHOTO" ? (
            <img src={item.url} alt="Submitted musician portfolio" className="max-h-64" />
          ) : item.media_type === "VIDEO" ? (
            <video src={item.url} controls className="max-h-64" />
          ) : (
            <audio src={item.url} controls />
          )}
          {actions("MEDIA", item.id)}
        </article>
      ))}
    </section>
  );
}
