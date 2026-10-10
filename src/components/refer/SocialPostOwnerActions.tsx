import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useDeletePost, useUpdatePost } from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";

export function SocialPostOwnerActions({ postId, caption }: { postId: string; caption: string }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(caption);
  const update = useUpdatePost();
  const remove = useDeletePost();

  useEffect(() => setDraft(caption), [caption]);

  function save() {
    update.mutate(
      { id: postId, caption: draft },
      {
        onSuccess: () => {
          setEditOpen(false);
          toast.success(fr ? "Publication modifiée" : "Post updated");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update post."),
      },
    );
  }

  function confirmDelete() {
    remove.mutate(postId, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast.success(fr ? "Publication supprimée" : "Post deleted");
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete post."),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={tx("Post options", "Options de publication")}>
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil aria-hidden />
            {tx("Edit post", "Modifier")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 aria-hidden />
            {tx("Delete post", "Supprimer")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tx("Edit post", "Modifier la publication")}</DialogTitle>
            <DialogDescription>{tx("Update the text on your post.", "Modifiez le texte de votre publication.")}</DialogDescription>
          </DialogHeader>
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2200))} rows={6} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{tx("Cancel", "Annuler")}</Button>
            <Button onClick={save} disabled={update.isPending || draft === caption}>{tx("Save", "Enregistrer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx("Delete this post?", "Supprimer cette publication ?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tx("The post and its photos will be permanently deleted.", "La publication et ses photos seront supprimées définitivement.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx("Cancel", "Annuler")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete} disabled={remove.isPending}>
              {tx("Delete", "Supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}