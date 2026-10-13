import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import type { HistoryState } from "@/lib/booking-history";

export function BookingHistoryActions({
  archived,
  change,
}: {
  archived: boolean;
  change: (state: HistoryState | null) => Promise<void>;
}) {
  const { tx } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function act(state: HistoryState | null) {
    setBusy(true);
    try {
      await change(state);
      setConfirm(false);
    } catch {
      toast.error(
        tx(
          "Could not update history. Try again.",
          "Impossible de modifier l’historique. Réessayez.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        disabled={busy}
        title={archived ? tx("Restore", "Restaurer") : tx("Archive", "Archiver")}
        aria-label={archived ? tx("Restore", "Restaurer") : tx("Archive", "Archiver")}
        onClick={() => void act(archived ? null : "ARCHIVED")}
      >
        {archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
      </Button>
      {archived ? (
        <Button
          size="icon"
          variant="ghost"
          disabled={busy}
          title={tx("Delete permanently", "Supprimer définitivement")}
          aria-label={tx("Delete permanently", "Supprimer définitivement")}
          onClick={() => setConfirm(true)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      ) : null}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {tx("Delete from your history?", "Supprimer de votre historique ?")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {tx(
              "You cannot restore this entry. Receipts, payment records and the other person's history are retained.",
              "Cette entrée ne pourra pas être restaurée. Les reçus, paiements et l’historique de l’autre personne sont conservés.",
            )}
          </p>
          <Button variant="destructive" disabled={busy} onClick={() => void act("DELETED")}>
            {tx("Delete permanently", "Supprimer définitivement")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
