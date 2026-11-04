import { useState } from "react";
import { Clock, Download, Flag, MoreVertical, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShareSheet, shareLink } from "./ShareSheet";
import { ReportDialog } from "./ReportDialog";
import { useI18n } from "@/lib/i18n";

/** Public social videos are free; paid course actions require a separate entitlement boundary. */
export function VideoActions({ id, title, authorId }: { id: string; title: string; authorId: string }) {
  const { tx } = useI18n();
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={tx("Video options", "Options de la vidéo")}><MoreVertical className="size-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[80]">
        <DropdownMenuItem onSelect={() => setShare(true)}><Share2 className="size-4" />{tx("Share", "Partager")}</DropdownMenuItem>
        <DropdownMenuItem disabled><Clock className="size-4" />{tx("Watch later — coming soon", "À regarder plus tard — bientôt")}</DropdownMenuItem>
        <DropdownMenuItem disabled><Download className="size-4" />{tx("Download — unavailable", "Téléchargement — indisponible")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setReport(true)}><Flag className="size-4" />{tx("Report", "Signaler")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <ShareSheet open={share} onOpenChange={setShare} url={shareLink("post", id)} title={title} targetType="post" targetId={id} />
    <ReportDialog hideTrigger open={report} onOpenChange={setReport} targetType="POST" targetId={id} targetUserId={authorId} targetLabel={title} />
  </>;
}