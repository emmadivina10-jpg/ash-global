import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Flag, MoreHorizontal, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog, type ReportTargetType } from "./ReportDialog";
import { BlockUserDialog } from "./BlockUserDialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Three-dot menu with Report and Block for content owned by someone else.
 * Required by Apple Guideline 1.2 on every piece of user-generated content.
 */
export function SafetyMenu({
  targetType,
  targetId,
  targetUserId,
  targetName,
  className,
  triggerClassName,
  allowBlock = true,
}: {
  targetType: ReportTargetType;
  targetId?: string | null;
  targetUserId?: string | null;
  targetName?: string | undefined;
  className?: string;
  triggerClassName?: string;
  allowBlock?: boolean;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("size-8 rounded-full text-muted-foreground", triggerClassName)}
            aria-label={tx("More options", "Plus d'options")}
          >
            <MoreHorizontal className="size-5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="size-4" aria-hidden />
            {tx("Report", "Signaler")}
          </DropdownMenuItem>
          {allowBlock && targetUserId ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setBlockOpen(true)}
            >
              <ShieldOff className="size-4" aria-hidden />
              {tx("Block User", "Bloquer l'utilisateur")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/community-guidelines">
              <BookOpen className="size-4" aria-hidden />
              {tx("Community Guidelines", "Règles de la communauté")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        hideTrigger
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={targetType}
        targetId={targetId ?? null}
        targetUserId={targetUserId ?? null}
        targetLabel={targetName}
        allowBlock={false}
      />
      {targetUserId ? (
        <BlockUserDialog
          open={blockOpen}
          onOpenChange={setBlockOpen}
          targetUserId={targetUserId}
          targetName={targetName}
          source={targetType.toLowerCase()}
        />
      ) : null}
    </div>
  );
}
