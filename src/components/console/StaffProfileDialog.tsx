import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, UserRound } from "lucide-react";
import { getMyStaffProfile, updateMyStaffProfile, uploadMyStaffAvatar } from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

/** Self-service employee profile editor: photo, display name and phone. */
export function StaffProfileDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const load = useServerFn(getMyStaffProfile);
  const save = useServerFn(updateMyStaffProfile);
  const upload = useServerFn(uploadMyStaffAvatar);

  const { data, isLoading, error } = useQuery({
    queryKey: ["console", "my-staff-profile"],
    queryFn: () => load(),
    enabled: open,
    retry: false,
  });

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.employee_name ?? "");
      setPhone(data.profile.phone ?? "");
    }
  }, [data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["console", "my-staff-profile"] });
    await queryClient.invalidateQueries({ queryKey: ["console", "status"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => save({ data: { employeeName: name, phone } }),
    onSuccess: async () => {
      toast.success("Profile saved successfully");
      await invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      });
      return upload({ data: { dataUrl } });
    },
    onSuccess: async () => {
      toast.success("Profile photo updated");
      await invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not upload photo"),
  });

  const profile = data?.profile;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>My employee profile</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </div>
        ) : error || !profile ? (
          <p className="py-6 text-sm text-muted-foreground">
            Profile editing is available for employee accounts only.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.avatarSignedUrl ? (
                  <img
                    src={profile.avatarSignedUrl}
                    alt={profile.employee_name ?? "Profile photo"}
                    className="size-20 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="grid size-20 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
                    <UserRound className="size-8" aria-hidden />
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="size-4" aria-hidden />
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-bold text-foreground">{profile.employee_name ?? profile.username}</p>
                <p className="text-xs text-muted-foreground">{profile.position ?? "Staff"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.department.replace(/_/g, " ")}
                  {profile.employee_id ? ` · ${profile.employee_id}` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-profile-name">Display name</Label>
              <Input
                id="staff-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-profile-phone">Phone</Label>
              <Input
                id="staff-profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                placeholder="e.g. +237 6XX XXX XXX"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Department, position and employee ID are managed by the CEO office.
            </p>
            <Button
              className="w-full"
              disabled={saveMutation.isPending || !name.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Save changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
