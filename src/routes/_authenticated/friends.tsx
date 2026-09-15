import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, MessageSquare, Search, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFriendships,
  useMemberSearch,
  useRemoveFriend,
  useRespondFriendRequest,
  useSendFriendRequest,
} from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends — ASH" },
      { name: "description", content: "Add ASH members as friends and message them directly." },
      { property: "og:title", content: "Friends — ASH" },
      { property: "og:description", content: "Your ASH friend list, requests and direct chats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { data } = useFriendships();
  const [term, setTerm] = useState("");
  const { data: results } = useMemberSearch(term);
  const send = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const remove = useRemoveFriend();

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const known = new Set([
    ...friends.map((f) => f.other.id),
    ...incoming.map((f) => f.other.id),
    ...outgoing.map((f) => f.other.id),
  ]);

  async function openChat(friendId: string) {
    const { data: auth } = await supabase.auth.getUser();
    const me = auth.user?.id;
    if (!me) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .is("group_id", null)
      .or(
        `and(client_id.eq.${me},owner_id.eq.${friendId}),and(client_id.eq.${friendId},owner_id.eq.${me})`,
      )
      .maybeSingle();
    let conversationId = existing?.id ?? null;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ client_id: me, owner_id: friendId })
        .select("id")
        .single();
      if (error) {
        toast.error(fr ? "Impossible d'ouvrir la discussion." : "Could not open the chat.");
        return;
      }
      conversationId = created.id;
    }
    void navigate({ to: "/messages", search: { c: conversationId } } as never);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {fr ? "Amis" : "Friends"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr
            ? "Ajoutez de vrais membres ASH et discutez directement."
            : "Add real ASH members and chat with them directly."}
        </p>
      </header>

      <div className="tile space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={fr ? "Rechercher un membre…" : "Search members…"}
            aria-label={fr ? "Rechercher un membre" : "Search members"}
            className="pl-9"
          />
        </div>
        {term.trim().length >= 2 ? (
          (results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{fr ? "Aucun membre trouvé." : "No members found."}</p>
          ) : (
            <ul className="space-y-2">
              {(results ?? []).map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Avatar path={person.avatar_url} name={person.name} className="size-10" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {person.name}
                  </span>
                  {known.has(person.id) ? (
                    <span className="text-xs text-muted-foreground">{fr ? "Déjà lié" : "Already linked"}</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        send.mutate(person.id, {
                          onSuccess: () => toast.success(fr ? "Demande envoyée" : "Request sent"),
                          onError: () => toast.error(fr ? "Échec de l'envoi" : "Could not send"),
                        })
                      }
                    >
                      <UserPlus className="size-4" aria-hidden />
                      {fr ? "Ajouter" : "Add"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      {incoming.length > 0 ? (
        <section className="tile space-y-3 p-4">
          <h2 className="font-display text-base font-extrabold text-foreground">
            {fr ? "Demandes reçues" : "Friend requests"}
          </h2>
          {incoming.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3">
              <Avatar path={entry.other.avatar_url} name={entry.other.name} className="size-10" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {entry.other.name}
              </span>
              <Button
                size="sm"
                onClick={() => respond.mutate({ id: entry.id, accept: true })}
                aria-label={fr ? "Accepter" : "Accept"}
              >
                <Check className="size-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond.mutate({ id: entry.id, accept: false })}
                aria-label={fr ? "Refuser" : "Decline"}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      {outgoing.length > 0 ? (
        <section className="tile space-y-2 p-4">
          <h2 className="font-display text-base font-extrabold text-foreground">
            {fr ? "Demandes envoyées" : "Sent requests"}
          </h2>
          {outgoing.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3">
              <Avatar path={entry.other.avatar_url} name={entry.other.name} className="size-9" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{entry.other.name}</span>
              <span className="text-xs text-muted-foreground">{fr ? "En attente" : "Pending"}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="tile space-y-3 p-4">
        <h2 className="font-display text-base font-extrabold text-foreground">
          {fr ? `Mes amis (${friends.length})` : `My friends (${friends.length})`}
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {fr ? "Pas encore d'amis — cherchez un membre ci-dessus." : "No friends yet — search for a member above."}
          </p>
        ) : (
          friends.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3">
              <Avatar path={entry.other.avatar_url} name={entry.other.name} className="size-10" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {entry.other.name}
              </span>
              <Button size="sm" variant="outline" onClick={() => void openChat(entry.other.id)}>
                <MessageSquare className="size-4" aria-hidden />
                {fr ? "Message" : "Message"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={fr ? "Retirer" : "Remove"}
                onClick={() => remove.mutate(entry.id)}
              >
                <UserMinus className="size-4" aria-hidden />
              </Button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
