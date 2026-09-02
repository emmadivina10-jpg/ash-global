import { useState } from "react";
import { Flag, Loader2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export type ReportTargetType = "PROVIDER" | "REVIEW" | "MESSAGE" | "USER" | "PORTFOLIO";

const REASONS = [
  { value: "SPAM", en: "Spam or misleading", fr: "Spam ou trompeur" },
  { value: "HARASSMENT", en: "Harassment or abuse", fr: "Harcèlement ou abus" },
  { value: "SCAM", en: "Scam or fraud", fr: "Arnaque ou fraude" },
  { value: "SEXUAL", en: "Sexual or explicit content", fr: "Contenu sexuel ou explicite" },
  { value: "VIOLENCE", en: "Violence or threats", fr: "Violence ou menaces" },
  { value: "HATE", en: "Hate speech", fr: "Discours haineux" },
  { value: "ILLEGAL", en: "Illegal goods or services", fr: "Biens ou services illégaux" },
  { value: "IMPERSONATION", en: "Impersonation", fr: "Usurpation d'identité" },
  { value: "OTHER", en: "Something else", fr: "Autre chose" },
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
}: {
  targetType: ReportTargetType;
  targetId?: string | null;
  targetUserId?: string | null;
  targetLabel?: string;
  allowBlock?: boolean;
  className?: string;
  variant?: "ghost" | "outline";
  compact?: boolean;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("SPAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState(false);

  async function submit() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBusy(false);
      toast.error(fr ? "Connectez-vous pour signaler." : "Sign in to report.");
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
      toast.error(error.message || (fr ? "Signalement échoué" : "Report failed"));
      return;
    }
    setOpen(false);
    setDetails("");
    toast.success(
      fr
        ? "Merci. L'équipe ASH examine chaque signalement sous 24 h."
        : "Thank you. The ASH team reviews every report within 24 hours.",
    );
  }

  async function block() {
    if (!targetUserId) return;
    setBlocking(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBlocking(false);
      toast.error(fr ? "Connectez-vous d'abord." : "Sign in first.");
      return;
    }
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: uid, blocked_id: targetUserId });
    setBlocking(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    toast.success(
      fr ? "Utilisateur bloqué. Il ne peut plus vous écrire." : "User blocked. They can no longer message you.",
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={compact ? "sm" : "default"}
          className={cn("gap-1.5 text-muted-foreground", className)}
        >
          <Flag className="size-4" aria-hidden />
          {compact ? null : fr ? "Signaler" : "Report"}
          {compact ? <span className="sr-only">{fr ? "Signaler" : "Report"}</span> : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fr ? "Signaler un contenu" : "Report content"}</DialogTitle>
          <DialogDescription>
            {targetLabel
              ? fr
                ? `Signalement de « ${targetLabel} ». `
                : `Reporting “${targetLabel}”. `
              : ""}
            {fr
              ? "ASH applique une tolérance zéro pour les contenus abusifs. Chaque signalement est examiné sous 24 heures."
              : "ASH has zero tolerance for objectionable content. Every report is reviewed within 24 hours."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{fr ? "Motif" : "Reason"}</Label>
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
            <Label htmlFor="report-details">{fr ? "Détails (optionnel)" : "Details (optional)"}</Label>
            <Textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={fr ? "Que s'est-il passé ?" : "What happened?"}
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
              {fr ? "Bloquer" : "Block user"}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Flag className="size-4" aria-hidden />}
            {fr ? "Envoyer le signalement" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
