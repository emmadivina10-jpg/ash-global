import { useEffect, useMemo, useState } from "react";
import { Avatar } from "./AvatarUpload";
import { useHashtagSuggestions, useTagPeopleSearch } from "@/lib/social.queries";
import { VerifiedBadge } from "./VerifiedBadge";

function activeToken(value: string) {
  return value.match(/(?:^|\s)([#@][\p{L}\p{N}_.]*)$/u)?.[1] ?? "";
}

export function SocialSuggestions({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [debounced, setDebounced] = useState("");
  const token = useMemo(() => activeToken(value), [value]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(token.slice(1)), 220);
    return () => window.clearTimeout(timer);
  }, [token]);
  const people = useTagPeopleSearch(token.startsWith("@") ? debounced : "");
  const hashtags = useHashtagSuggestions(token.startsWith("#") ? debounced : "");
  const replace = (next: string) => onChange(value.slice(0, value.length - token.length) + next + " ");
  if (!token || debounced.length < 2) return null;
  const rows = token.startsWith("@") ? people.data ?? [] : hashtags.data ?? [];
  return (
    <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-[var(--shadow-raised)]">
      {rows.length === 0 && !people.isFetching && !hashtags.isFetching ? <p className="px-3 py-4 text-center text-xs text-muted-foreground">{token.startsWith("@") ? "No people found" : "No hashtags found"}</p> : null}
      {token.startsWith("@") ? (people.data ?? []).map((person) => (
        <button key={person.user_id} type="button" onClick={() => replace(`@${person.username}`)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-muted">
          <Avatar path={person.avatar_url} name={person.full_name} className="size-8" />
          <span className="min-w-0"><span className="flex items-center gap-1 truncate text-sm font-semibold">{person.full_name}<VerifiedBadge tier={person.verified_tier} until={person.verified_until} size={13}/></span><span className="block text-xs text-muted-foreground">@{person.username}</span></span>
        </button>
      )) : (hashtags.data ?? []).map((tag) => (
        <button key={tag.id} type="button" onClick={() => replace(`#${tag.name}`)} className="flex w-full justify-between rounded-xl px-3 py-2 text-left hover:bg-muted"><span className="font-semibold text-primary">#{tag.name}</span><span className="text-xs text-muted-foreground">{tag.usage_count}</span></button>
      ))}
    </div>
  );
}