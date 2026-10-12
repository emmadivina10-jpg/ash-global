import { useRef, useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryItem = { id: string; url: string; caption?: string | null; isVideo?: boolean };

/** Facebook Marketplace-style swipeable photo strip with page dots underneath. */
export function ListingGallery({ items, alt, onOpen, emptyLabel }: {
  items: GalleryItem[]; alt: string; onOpen?: (item: GalleryItem) => void; emptyLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (items.length === 0) {
    return <div className="grid aspect-square w-full place-items-center rounded-2xl bg-muted text-muted-foreground sm:aspect-[4/3]"><div className="flex flex-col items-center gap-2"><ImageOff className="size-8" aria-hidden /><span className="text-sm">{emptyLabel}</span></div></div>;
  }
  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="space-y-2">
      <div
        ref={ref}
        data-pull-refresh-ignore
        onScroll={(e) => { const el = e.currentTarget; setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); }}
        className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-muted [scrollbar-width:none] sm:aspect-[4/3] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onOpen?.(item)} className="relative size-full shrink-0 snap-center" aria-label={item.caption ?? alt}>
            {item.isVideo ? (
              <><video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" /><span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full bg-background/90 text-foreground"><Play className="size-5 fill-current" aria-hidden /></span></span></>
            ) : (
              <img src={item.url} alt={item.caption ?? alt} loading="lazy" className="size-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Photos">
          {items.map((item, i) => (
            <button key={item.id} type="button" role="tab" aria-selected={i === index} aria-label={`${i + 1} / ${items.length}`} onClick={() => go(i)} className={cn("h-2 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-2 bg-muted-foreground/40")} />
          ))}
        </div>
      )}
    </div>
  );
}
