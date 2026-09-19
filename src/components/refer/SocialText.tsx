import { Fragment } from "react";
import { useNavigate } from "@tanstack/react-router";

const TOKEN = /([#@][\p{L}\p{N}_.]+)/gu;

export function SocialText({ text, className }: { text: string; className?: string }) {
  const navigate = useNavigate();
  return (
    <p className={className}>
      {text.split(TOKEN).map((part, index) => {
        if (part.startsWith("#")) {
          return (
            <button key={`${part}-${index}`} type="button" className="font-semibold text-primary hover:underline" onClick={(event) => {
              event.stopPropagation();
              void navigate({ to: "/hashtag/$tag", params: { tag: part.slice(1).toLowerCase() } });
            }}>
              {part}
            </button>
          );
        }
        if (part.startsWith("@")) {
          return <MentionToken key={`${part}-${index}`} value={part} />;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </p>
  );
}

function MentionToken({ value }: { value: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="font-semibold text-primary hover:underline" onClick={async (event) => {
      event.stopPropagation();
      const { supabase } = await import("@/integrations/supabase/client");
      const { directory } = await import("@/lib/public-profiles");
      const { data } = await directory().select("user_id").ilike("username", value.slice(1)).maybeSingle();
      if (data?.user_id) void navigate({ to: "/u/$userId", params: { userId: data.user_id } });
    }}>
      {value}
    </button>
  );
}