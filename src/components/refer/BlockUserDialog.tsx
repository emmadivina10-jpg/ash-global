import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
import { useI18n } from "@/lib/i18n";

/** Refetch every list so a blocked member's content disappears immediately. */
export function useRefreshAfterBlock() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries();
  };
}

/** Confirmation dialog that creates (or removes) a persistent block. */
export function BlockUserDialog({
  open,
  onOpenChange,
  targetUserId,
  targetName,
  source,
  unblock = false,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName?: string | undefined;
  source: string;
  unblock?: boolean;
  onDone?: () => void;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [busy, setBusy] = useState(false);
  const refresh = useRefreshAfterBlock();

  async function confirm() {
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) {
      setBusy(false);
      toast.error(tx("Sign in first.", "Connectez-vous d'abord."));
      return;
    }
    const { error } = unblock
      ? await supabase.from("user_blocks").delete().eq("blocker_id", uid).eq("blocked_id", targetUserId)
      : await supabase
          .from("user_blocks")
          .insert({ blocker_id: uid, blocked_id: targetUserId, reason: source.slice(0, 60) });
    setBusy(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error(tx("Could not complete that. Try again.", "Action impossible. Réessayez."));
      return;
    }
    onOpenChange(false);
    await refresh();
    onDone?.();
    toast.success(
      unblock
        ? tx("User unblocked.", "Utilisateur débloqué.")
        : tx("User blocked. Their content is now hidden from you.", "Utilisateur bloqué. Son contenu est masqué."),
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {unblock ? (tx("Unblock this user?", "Débloquer cet utilisateur ?")) : tx("Block this user?", "Bloquer cet utilisateur ?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {unblock
              ? fr
                ? `${targetName ?? "Ce membre"} pourra de nouveau voir votre contenu et interagir avec vous.`
                : `${targetName ?? "This member"} will be able to see and interact with you again.`
              : fr
                ? `${targetName ?? "Ce membre"} ne pourra plus vous écrire, commenter vos publications ni interagir avec vous. Ses publications, reels et commentaires disparaîtront de votre fil. L'équipe ASH Trust & Safety est informée.`
                : `${targetName ?? "This member"} will no longer be able to message you, comment on your posts or interact with you. Their posts, reels and comments will be removed from your feed. ASH Trust & Safety is notified.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{tx("Cancel", "Annuler")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
            className={unblock ? undefined : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldOff className="size-4" aria-hidden />}
            {unblock ? (tx("Unblock", "Débloquer")) : tx("Block user", "Bloquer")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
