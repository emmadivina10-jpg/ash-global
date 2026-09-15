import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import review1 from "@/assets/review-1.jpg";
import review2 from "@/assets/review-2.jpg";
import review3 from "@/assets/review-3.jpg";
import { cn } from "@/lib/utils";

type Review = { name: string; role: string; roleFr: string; photo: string; en: string; fr: string };

/** Sample testimonials shown on the welcome screen until real member reviews land. */
const REVIEWS: Review[] = [
  {
    name: "Linda M.",
    role: "Salon owner, Douala",
    roleFr: "Gérante de salon, Douala",
    photo: review1,
    en: "I filled my week with bookings from ASH. Clients find me, pay on mobile money, and I never chase anyone.",
    fr: "ASH a rempli ma semaine de réservations. Les clientes me trouvent, paient par Mobile Money, et je ne cours plus après personne.",
  },
  {
    name: "Jordan B.",
    role: "Electrician, Yaoundé",
    roleFr: "Électricien, Yaoundé",
    photo: review2,
    en: "Three jobs in my first week. The badge and reviews made people trust me before we even spoke.",
    fr: "Trois chantiers dès la première semaine. Le badge et les avis ont rassuré les clients avant même le premier appel.",
  },
  {
    name: "Fabiola N.",
    role: "Shop owner, Buea",
    roleFr: "Commerçante, Buea",
    photo: review3,
    en: "I sell in the Hub, post to the feed and get paid the same day. Everything my business needs is in one app.",
    fr: "Je vends sur le Hub, je publie dans le fil et je suis payée le jour même. Tout mon business tient dans une seule app.",
  },
];

export function ReviewsCarousel({ fr = false, className }: { fr?: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((value) => (value + 1) % REVIEWS.length), 5000);
    return () => window.clearInterval(id);
  }, [paused]);

  const review = REVIEWS[index]!;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-card/50 px-4 py-3.5 backdrop-blur-md",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div key={index} className="ash-fade-up flex items-start gap-3 text-left">
        <img
          src={review.photo}
          alt={review.name}
          loading="lazy"
          width={96}
          height={96}
          className="size-11 shrink-0 rounded-full object-cover ring-2 ring-primary/30"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, star) => (
              <Star key={star} className="size-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-foreground">“{fr ? review.fr : review.en}”</p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {review.name} · {fr ? review.roleFr : review.role}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {REVIEWS.map((item, dot) => (
          <button
            key={item.name}
            type="button"
            aria-label={`${fr ? "Avis" : "Review"} ${dot + 1}`}
            onClick={() => setIndex(dot)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              dot === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}
