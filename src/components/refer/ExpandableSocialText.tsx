import { useEffect, useRef, useState } from "react";
import { SocialText } from "./SocialText";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ExpandableSocialText({
  text,
  className,
  buttonClassName,
}: {
  text: string;
  className?: string;
  buttonClassName?: string;
}) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = textRef.current;
    if (!node || expanded) return;

    const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div>
      <div ref={textRef} className={cn(!expanded && "line-clamp-2")}>
        <SocialText text={text} {...(className ? { className } : {})} />
      </div>
      {overflowing || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            "mt-1 inline-flex touch-manipulation text-sm font-semibold text-muted-foreground hover:text-foreground",
            buttonClassName,
          )}
          aria-expanded={expanded}
        >
          {expanded
            ? lang === "fr"
              ? "Voir moins"
              : "See less"
            : lang === "fr"
              ? "Voir plus"
              : "See more"}
        </button>
      ) : null}
    </div>
  );
}
