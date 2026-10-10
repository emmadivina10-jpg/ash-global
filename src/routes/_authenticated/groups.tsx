import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MessageSquare, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { GroupVerifiedBadge } from "@/components/refer/GroupBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useAddGroupMembers,
  useCreateGroup,
  useDeleteGroup,
  useFriendships,
  useGroups,
  useMemberSearch,
} from "@/lib/social.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Groups — ASH" },
      { name: "description", content: "Create ASH group chats and add the members you choose." },
      { property: "og:title", content: "Groups — ASH" },
      { property: "og:description", content: "Private group conversations for your ASH circle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const { data: friendships } = useFriendships();
  const create = useCreateGroup();
  const addMembers = useAddGroupMembers();
  const removeGroup = useDeleteGroup();
  const { data: myProfile } = useProfile();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addSelected, setAddSelected] = useState<string[]>([]);
  const [peopleTerm, setPeopleTerm] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data: searched } = useMemberSearch(peopleTerm);

  const friends = friendships?.friends ?? [];
  // Members you can add: your friends, plus anyone you look up by name.
  const candidates = (() => {
    const base = friends.map((entry) => entry.other);
    const found = (searched ?? []).filter((person) => !base.some((f) => f.id === person.id));
    const all = [...base, ...found];
    const term = peopleTerm.trim().toLowerCase();
    return term ? all.filter((person) => person.name.toLowerCase().includes(term)) : all;
  })();

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tx("Groups", "Groupes")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Create a group and add your friends.", "Créez un groupe et ajoutez vos amis.")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="touch-manipulation">
              <Plus className="size-4" aria-hidden />
              {tx("New", "Nouveau")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{tx("Create a group", "Créer un groupe")}</DialogTitle>
            </DialogHeader>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              placeholder={tx("Group name", "Nom du groupe")}
              aria-label={tx("Group name", "Nom du groupe")}
            />
            <p className="text-xs font-semibold text-muted-foreground">
              {tx("Choose members", "Choisissez les membres")}
            </p>
            <Input
              value={peopleTerm}
              onChange={(event) => setPeopleTerm(event.target.value)}
              placeholder={tx("Search people on ASH", "Rechercher un membre")}
              aria-label={tx("Search people", "Rechercher un membre")}
            />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {tx("Search someone by name to add them.", "Cherchez un membre par son nom pour l'ajouter.")}
                </p>
              ) : (
                candidates.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelected((list) => toggle(list, person.id))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                      selected.includes(person.id) ? "bg-primary/10" : "hover:bg-muted",
                    )}
                  >
                     <Avatar path={person.avatar_url} name={person.name} online={person.online} hasUpdate={person.has_update} className="size-9" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {person.name}
                    </span>
                    {selected.includes(person.id) ? (
                      <span className="text-xs font-bold text-primary">{fr ? "Ajouté" : "Added"}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <Button
              disabled={create.isPending || name.trim().length < 2}
              className="touch-manipulation"
              onClick={() =>
                create.mutate(
                  { name: name.trim(), memberIds: selected },
                  {
                    onSuccess: () => {
                      toast.success(fr ? "Groupe créé" : "Group created");
                      setOpen(false);
                      setName("");
                      setSelected([]);
                      setPeopleTerm("");
                    },
                    onError: (error) =>
                      toast.error(error instanceof Error ? error.message : "Could not create the group."),
                  },
                )
              }
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {tx("Create", "Créer")}
            </Button>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (groups ?? []).length === 0 ? (
        <div className="tile grid place-items-center gap-2 p-10 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {tx("No groups yet.", "Aucun groupe pour l'instant.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(groups ?? []).map((group) => (
            <article key={group.id} className="tile flex items-center gap-3 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Users className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                  <span className="truncate">{group.name}</span>
                  {group.owner_verified ? (
                    <GroupVerifiedBadge label={fr ? "Groupe vérifié" : "Verified group"} />
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {group.member_count} {fr ? "membres" : "members"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddingTo(group.id);
                  setAddSelected([]);
                }}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
              {group.owner_id === myProfile?.user_id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={fr ? "Supprimer le groupe" : "Delete group"}
                  className="text-destructive"
                  onClick={() => setConfirmDelete(group.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ) : null}
              <Button
                size="sm"
                disabled={!group.conversation_id}
                onClick={() =>
                  void navigate({ to: "/messages", search: { c: group.conversation_id } } as never)
                }
              >
                <MessageSquare className="size-4" aria-hidden />
                {fr ? "Ouvrir" : "Open"}
              </Button>
            </article>
          ))}
        </div>
      )}

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(value) => !value && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tx("Delete this group?", "Supprimer ce groupe ?")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tx("The group and its whole conversation are permanently removed for every member.", "Le groupe et toute la conversation seront définitivement supprimés pour tous les membres.")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
              {tx("Cancel", "Annuler")}
            </Button>
            <Button
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeGroup.isPending}
              onClick={() => {
                const id = confirmDelete;
                if (!id) return;
                removeGroup.mutate(id, {
                  onSuccess: () => {
                    toast.success(fr ? "Groupe supprimé" : "Group deleted");
                    setConfirmDelete(null);
                  },
                  onError: () => toast.error(fr ? "Échec de la suppression" : "Could not delete the group"),
                });
              }}
            >
              {removeGroup.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {tx("Delete", "Supprimer")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(addingTo)} onOpenChange={(value) => !value && setAddingTo(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tx("Add members", "Ajouter des membres")}</DialogTitle>
          </DialogHeader>
          <Input
            value={peopleTerm}
            onChange={(event) => setPeopleTerm(event.target.value)}
            placeholder={tx("Search people on ASH", "Rechercher un membre")}
            aria-label={tx("Search people", "Rechercher un membre")}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {candidates.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => setAddSelected((list) => toggle(list, person.id))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                  addSelected.includes(person.id) ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                 <Avatar path={person.avatar_url} name={person.name} online={person.online} hasUpdate={person.has_update} className="size-9" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {person.name}
                </span>
              </button>
            ))}
          </div>
          <Button
            disabled={addMembers.isPending || addSelected.length === 0}
            onClick={() => {
              if (!addingTo) return;
              addMembers.mutate(
                { groupId: addingTo, memberIds: addSelected },
                {
                  onSuccess: () => {
                    toast.success(fr ? "Membres ajoutés" : "Members added");
                    setAddingTo(null);
                  },
                  onError: () => toast.error(fr ? "Échec" : "Could not add members"),
                },
              );
            }}
          >
            {addMembers.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {tx("Add", "Ajouter")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
