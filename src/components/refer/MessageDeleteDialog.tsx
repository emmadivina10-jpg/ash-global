import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MessageDeleteDialog({
  open,
  onOpenChange,
  canDeleteEveryone,
  busy,
  onDeleteForMe,
  onDeleteForEveryone,
  tx,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDeleteEveryone: boolean;
  busy: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  tx: (en: string, fr: string) => string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-sm gap-3 rounded-lg bg-card p-5"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-base tracking-normal">
            {tx("Delete message?", "Supprimer le message ?")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {tx(
              "Delete for me removes it on this device only.",
              "Supprimer pour moi le retire uniquement sur cet appareil.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="ghost"
            disabled={busy}
            className="h-11 text-primary"
            onClick={onDeleteForMe}
          >
            {tx("Delete for me", "Supprimer pour moi")}
          </Button>
          {canDeleteEveryone ? (
            <Button
              variant="ghost"
              disabled={busy}
              className="h-11 text-primary"
              onClick={onDeleteForEveryone}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {tx("Delete for everyone", "Supprimer pour tout le monde")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={busy}
            className="h-11 text-primary"
            onClick={() => onOpenChange(false)}
          >
            {tx("Cancel", "Annuler")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
