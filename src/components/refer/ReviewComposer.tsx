import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyCommunityReview } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, { en: string; fr: string }> = {
  UNAUTHENTICATED: { en: "Please sign in to leave a review.", fr: "Connectez-vous pour laisser un avis." },
  INVALID_RATING: { en: "Choose between 1 and 5 stars.", fr: "Choisissez entre 1 et 5 étoiles." },
  PROVIDER_NOT_FOUND: { en: "This storefront is not available.", fr: "Cette vitrine n'est pas disponible." },
  CANNOT_REVIEW_SELF: { en: "You can't review your own storefront.", fr: "Vous ne pouvez pas vous auto-évaluer." },
  ALREADY_REVIEWED: {
    en: "You already left a community review for this pro.",
    fr: "Vous avez déjà laissé un avis communautaire pour ce pro.",
  },
};

/**
 * Lets any signed-in member leave one clearly-labelled community review per
 * provider. Reviews tied to a completed booking stay separate and are marked
 * as verified.
 */
export function ReviewComposer({
  providerId,
  isOwner,
  fr,
}: {
  providerId: string;
  isOwner: boolean;
  fr: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: mine, isLoading } = useMyCommunityReview(providerId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (isOwner || isLoading) return null;

  if (mine) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        {fr
          ? `Vous avez déjà laissé un avis communautaire (${mine.rating}/5).`
          : `You already left a community review (${mine.rating}/5).`}
      </p>
    );
  }

  async function submit() {
    if (rating < 1) {
      toast.error(fr ? "Choisissez une note." : "Pick a star rating.");
      return;
    }
    setSaving(true);
    const trimmed = comment.trim();
    const { data, error } = await supabase.rpc("submit_community_review", {
      _provider_id: providerId,
      _rating: rating,
      ...(trimmed ? { _comment: trimmed } : {}),
    });
    setSaving(false);

    const result = data as { ok?: boolean; error?: string } | null;
    if (error || !result?.ok) {
      const code = result?.error ?? "";
      const message = ERRORS[code];
      toast.error(message ? (fr ? message.fr : message.en) : (error?.message ?? "Could not save your review."));
      return;
    }

    setRating(0);
    setComment("");
    toast.success(fr ? "Merci pour votre avis !" : "Thanks for your review!");
    await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["provider", providerId] });
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-sm font-semibold text-foreground">
        {fr ? "Laisser un avis communautaire" : "Leave a community review"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {fr
          ? "Affiché comme « Avis communautaire » — les avis après prestation sont marqués « Réservation vérifiée »."
          : "Shown as a “Community review” — reviews after a completed booking are marked “Verified booking”."}
      </p>

      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} ${fr ? "étoiles" : "stars"}`}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                value <= rating ? "fill-gold text-gold" : "text-muted-foreground",
              )}
              aria-hidden
            />
          </button>
        ))}
      </div>

      <Textarea
        className="mt-2"
        rows={2}
        maxLength={400}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={fr ? "Dites-en un peu plus (facultatif)" : "Tell people a bit more (optional)"}
      />
      <Button className="mt-2" size="sm" disabled={saving} onClick={() => void submit()}>
        {fr ? "Publier l'avis" : "Post review"}
      </Button>
    </div>
  );
}
