import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/refer/AuthLayout";
import { AvatarUpload } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { announceIdentityDenial, identityStatus, IDENTITY_DENIED } from "@/lib/identity-client";

export const Route = createFileRoute("/setup-profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Add your profile picture — ASH Glo" },
      {
        name: "description",
        content: "Add a profile picture so people recognise you across ASH Glo chats, posts and Spotlight.",
      },
      { property: "og:title", content: "Add your profile picture — ASH Glo" },
      { property: "og:description", content: "The last step before you enter ASH Glo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetupProfilePage,
});

function SetupProfilePage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user.id;
      if (!id) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", id)
        .maybeSingle();
      if (cancelled) return;
      const row = profile as { full_name: string | null; avatar_url: string | null } | null;
      setUserId(id);
      setName(row?.full_name ?? null);
      setPath(row?.avatar_url ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function save(newPath: string) {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: newPath }).eq("user_id", userId);
    if (error) throw error;
    const identity = await identityStatus();
    if (identity.restricted) { announceIdentityDenial(identity); throw new Error(IDENTITY_DENIED); }
    setPath(newPath);
  }

  return (
    <AuthLayout
      title={fr ? "Votre photo de profil" : "Your profile picture"}
      subtitle={
        fr
          ? "Une dernière étape : ajoutez une photo pour que les membres vous reconnaissent."
          : "One last step: add a picture so members recognise you."
      }
    >
      {loading || !userId ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4">
            <Camera className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {fr
                ? "Prenez une photo ou choisissez-en une dans votre galerie. Vous pourrez la changer à tout moment dans votre profil."
                : "Take a photo or choose one from your gallery. You can change it any time from your profile."}
            </p>
          </div>

          <AvatarUpload userId={userId} path={path} name={name} onUploaded={save} />

          <Button
            className="h-12 w-full"
            disabled={!path}
            onClick={() => navigate({ to: "/feed", replace: true })}
          >
            {fr ? "Terminer et entrer" : "Finish and enter ASH"}
          </Button>
          {!path ? (
            <p className="text-center text-xs text-muted-foreground">
              {fr ? "Ajoutez une photo pour continuer." : "Add a picture to continue."}
            </p>
          ) : null}
        </div>
      )}
    </AuthLayout>
  );
}
