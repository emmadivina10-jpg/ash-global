import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flag, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/activity";
import { useRefreshAfterBlock } from "./BlockUserDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ReportTargetType = "PROVIDER" | "REVIEW" | "MESSAGE" | "USER" | "PORTFOLIO" | "PROPERTY" | "POST" | "SPOTLIGHT" | "COMMENT" | "STORY" | "MARKET" | "EVENT";

const REASONS = [
  { value: "HARASSMENT", en: "Harassment or bullying", fr: "Harcèlement ou intimidation" },
  { value: "HATE", en: "Hate or discrimination", fr: "Haine ou discrimination" },
  { value: "SEXUAL", en: "Sexual or inappropriate content", fr: "Contenu sexuel ou inapproprié" },
  { value: "VIOLENCE", en: "Violence or threats", fr: "Violence ou menaces" },
  { value: "SCAM", en: "Scam or fraud", fr: "Arnaque ou fraude" },
  { value: "ILLEGAL", en: "Illegal content", fr: "Contenu illégal" },
  { value: "SPAM", en: "Spam", fr: "Spam" },
  { value: "IMPERSONATION", en: "Impersonation", fr: "Usurpation d'identité" },
  { value: "OTHER", en: "Other", fr: "Autre" },
] as const;

/**
 * Report + block control. Both app stores require apps with user-generated
 * content to offer a way to flag objectionable content and block abusive users.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetUserId,
  targetLabel,
  allowBlock = true,
  className,
  variant = "ghost",
  compact = false,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  targetType: ReportTargetType;
  targetId?: string | null;
  targetUserId?: string | null;
  targetLabel?: string | undefined;
  allowBlock?: boolean;
  className?: string | undefined;
  variant?: "ghost" | "outline";
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const [reason, setReason] = useState<string>("HARASSMENT");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const refreshAfterBlock = useRefreshAfterBlock();

  async function submit() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBusy(false);
      toast.error(tx("Sign in to report.", "Connectez-vous pour signaler."));
      return;
    }
    const { error } = await supabase.from("content_reports").insert({
      reporter_id: uid,
      target_type: targetType,
      target_id: targetId ?? null,
      target_user_id: targetUserId ?? null,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("DUPLICATE_REPORT")) {
        setOpen(false);
        toast.info(tx("You already reported this. It is being reviewed.", "Vous avez déjà signalé ce contenu. Il est en cours d'examen."));
        return;
      }
      toast.error(tx("Report failed. Try again.", "Signalement échoué. Réessayez."));
      return;
    }
    trackEvent({
      event_type: "report",
      surface: "other",
      target_type: targetType,
      target_id: targetId ?? null,
      author_id: targetUserId ?? null,
    });
    setOpen(false);
    setDetails("");
    toast.success(
      tx("Thank you. Your report has been submitted and will be reviewed by ASH Trust & Safety.", "Merci. Votre signalement a été envoyé et sera examiné par l'équipe ASH Trust & Safety."),
    );
  }

  async function block() {
    if (!targetUserId) return;
    if (!window.confirm(tx("Block this user? You will no longer see their content and they cannot interact with you.", "Bloquer cet utilisateur ? Vous ne verrez plus son contenu et il ne pourra plus interagir avec vous."))) return;
    setBlocking(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBlocking(false);
      toast.error(tx("Sign in first.", "Connectez-vous d'abord."));
      return;
    }
    const { error } = await supabase
      .from("user_blocks")
      .insert({ blocker_id: uid, blocked_id: targetUserId, reason: `report:${targetType}` });
    setBlocking(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    await refreshAfterBlock();
    toast.success(
      tx("User blocked. Their content is now hidden from you.", "Utilisateur bloqué. Son contenu est masqué."),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={compact ? "sm" : "default"}
          className={cn("gap-1.5 text-muted-foreground", className)}
        >
          <Flag className="size-4" aria-hidden />
          {compact ? null : tx("Report", "Signaler")}
          {compact ? <span className="sr-only">{tx("Report", "Signaler")}</span> : null}
        </Button>
      </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx("Report content", "Signaler un contenu")}</DialogTitle>
          <DialogDescription>
            {targetLabel
              ? fr
                ? `Signalement de « ${targetLabel} ». `
                : `Reporting “${targetLabel}”. `
              : ""}
            {tx("ASH Glo has zero tolerance for objectionable content. Reports are reviewed by the Trust & Safety team. ", "ASH Glo applique une tolérance zéro pour les contenus abusifs. Les signalements sont examinés par l'équipe Trust & Safety. ")}
            <Link to="/community-guidelines" className="font-semibold text-primary hover:underline">
              {tx("Community Guidelines", "Règles de la communauté")}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tx("Reason", "Motif")}</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="grid gap-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`report-${r.value}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                >
                  <RadioGroupItem id={`report-${r.value}`} value={r.value} />
                  {fr ? r.fr : r.en}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details">{tx("Details (optional)", "Détails (optionnel)")}</Label>
            <Textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={tx("What happened?", "Que s'est-il passé ?")}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {allowBlock && targetUserId ? (
            <Button type="button" variant="outline" onClick={() => void block()} disabled={blocking}>
              {blocking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShieldOff className="size-4" aria-hidden />
              )}
              {tx("Block user", "Bloquer")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Flag className="size-4" aria-hidden />}
            {tx("Submit report", "Envoyer le signalement")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
