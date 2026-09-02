import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function storefrontUrl(slug: string) {
  const origin = typeof window === "undefined" ? "https://ashglogroup.company" : window.location.origin;
  return `${origin}/s/${slug}`;
}

/**
 * Share control for a storefront link. Uses the native share sheet on phones
 * (WhatsApp, status, etc.) and falls back to copy on desktop.
 */
export function ShareStorefront({
  slug,
  businessName,
  compact = false,
  className,
}: {
  slug: string;
  businessName: string;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = storefrontUrl(slug);

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const payload = {
      title: businessName,
      text: `${businessName} on ASH Glo — see prices, photos and book instantly.`,
      url,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied — paste it on WhatsApp or your status.");
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={`Share ${businessName}`}
        className={cn(
          "grid size-8 place-items-center rounded-full bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background",
          className,
        )}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Share2 className="size-3.5" aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
      Share link
    </button>
  );
}
