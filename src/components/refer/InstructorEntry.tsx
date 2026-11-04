import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Radio, Upload, UserPlus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMyCampusApplication, useMyInstructorProfile } from "@/lib/campus.queries";
import { CAMPUS_CHANNEL_POLICY } from "@/lib/campus-channel-policy";
import { useI18n } from "@/lib/i18n";

export function InstructorEntry() {
  const { tx } = useI18n();
  const { data: instructor, isLoading } = useMyInstructorProfile();
  const { data: application } = useMyCampusApplication();
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline"><Video className="size-4" />{tx("Creator space", "Espace créateur")}</Button></DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <Video className="mb-3 size-8 text-primary" aria-hidden />
        <DialogTitle>{tx("Your ASH instructor channel", "Votre chaîne d’instructeur ASH")}</DialogTitle>
        <DialogDescription>{tx("Create. Teach. Connect.", "Créez. Enseignez. Échangez.")}</DialogDescription>
      </DialogHeader>
      {isLoading ? <p>{tx("Loading…", "Chargement…")}</p> : instructor ? <>
        <Button asChild className="h-12 justify-between"><Link to="/discover/upload"><span className="flex items-center gap-2"><Upload className="size-4" />{tx("Upload a video", "Publier une vidéo")}</span><ArrowUpRight className="size-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/campus/teaching">{tx("My instructor space", "Mon espace instructeur")}</Link></Button>
      </> : <>
        <Button asChild className="h-12"><Link to="/campus/become-instructor"><UserPlus className="size-4" />{tx("Become an instructor", "Devenir instructeur")}</Link></Button>
        {application && <p className="text-sm text-muted-foreground">{tx("Application", "Candidature")} · {application.status.replaceAll("_", " ")}</p>}
        <Button asChild variant="outline"><Link to="/campus/teaching">{tx("Already an instructor", "Déjà instructeur")}</Link></Button>
      </>}
      <Button variant="outline" disabled={!CAMPUS_CHANNEL_POLICY.liveEnabled}><Radio className="size-4" />{tx("Live sessions — coming soon", "Séances en direct — bientôt")}</Button>
    </DialogContent>
  </Dialog>;
}