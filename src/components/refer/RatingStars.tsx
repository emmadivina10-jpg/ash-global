import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  value,
  size = 14,
  onChange,
  className,
}: {
  value: number;
  size?: number;
  onChange?: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const content = (
          <Star
            style={{ width: size, height: size }}
            className={cn(filled ? "fill-gold text-gold" : "text-muted-foreground/40")}
            aria-hidden
          />
        );
        return onChange ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} stars`}
          >
            {content}
          </button>
        ) : (
          <span key={star}>{content}</span>
        );
      })}
    </div>
  );
}
