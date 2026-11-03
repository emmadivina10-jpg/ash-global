import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  RIDER_DOC_BUCKET,
  clampSignedUrlSeconds,
  riderDocPath,
  validateRiderDoc,
  type RiderDocType,
} from "@/lib/dispatch-docs";

/**
 * ASH Logistics data access. Reads go through RLS as the signed-in member;
 * every write goes through the checked dispatch_* database actions. Never use
 * an admin client here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type DispatchJob = {
  id: string;
  vendor_id: string | null;
  customer_id: string | null;
  rider_user_id: string | null;
  status: string;
  fulfillment_mode: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  notes: string | null;
  fee_amount: number | null;
  approved_fee_amount: number | null;
  quote_approved_at: string | null;
  offer_expires_at: string | null;
  created_at: string;
  updated_at: string;
};
export type DispatchEvent = { id: string; delivery_id: string; status: string; actor_type: string; note: string | null; created_at: string };
export type RiderRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  licence_number: string | null;
  verification_status: string;
  verification_note: string | null;
  is_active: boolean;
  availability_status: string;
  service_zones: string[];
  created_at: string;
};
export type TeamRow = { id: string; vendor_id: string; rider_user_id: string; status: string; accepted_at: string | null };
export type RiderDoc = { id: string; rider_user_id: string; doc_type: string; storage_path: string; created_at: string };

const ERRORS: Record<string, [string, string]> = {
  NOT_ALLOWED: ["You are not allowed to do this.", "Vous n'êtes pas autorisé à faire cela."],
  NOT_SIGNED_IN: ["Please sign in again.", "Veuillez vous reconnecter."],
  INVALID_STATUS: ["This delivery has moved on. Refresh and try again.", "Cette livraison a changé. Actualisez et réessayez."],
  QUOTE_NOT_APPROVED: ["The customer must approve the delivery fee first.", "Le client doit d'abord approuver les frais."],
  QUOTE_CHANGED: ["The fee changed. Review the new fee.", "Les frais ont changé. Vérifiez le nouveau montant."],
  RIDER_UNAVAILABLE: ["That rider is not verified, active and available.", "Ce livreur n'est pas vérifié, actif et disponible."],
  NOT_VENDOR_RIDER: ["That rider is not on your team.", "Ce livreur ne fait pas partie de votre équipe."],
  NO_RIDER_FOR_SELF_PICKUP: ["Self-pickup orders do not use a rider.", "Le retrait en boutique n'utilise pas de livreur."],
  ADDRESS_REQUIRED: ["Enter the pickup and delivery addresses.", "Saisissez les adresses de retrait et de livraison."],
  CANNOT_ORDER_FROM_SELF: ["You cannot request a delivery from your own shop.", "Vous ne pouvez pas commander à votre propre boutique."],
  BAD_FEE: ["Enter a fee between 0 and 1,000,000 XAF.", "Saisissez des frais entre 0 et 1 000 000 XAF."],
  NOT_REGISTERED: ["Register as a rider first.", "Inscrivez-vous d'abord comme livreur."],
  INVALID_INPUT: ["Check the details and try again.", "Vérifiez les informations et réessayez."],
  PLATE_REQUIRED: ["A plate number is required for motorcycles and cars.", "La plaque est requise pour motos et voitures."],
  SUSPENDED: ["This rider account is suspended.", "Ce compte livreur est suspendu."],
  DOCUMENTS_MISSING: ["Some required documents are missing.", "Des documents obligatoires manquent."],
  NOTE_REQUIRED: ["Add a short reason.", "Ajoutez une courte raison."],
  SELF_REVIEW: ["You cannot review your own rider account.", "Vous ne pouvez pas examiner votre propre compte."],
  RIDER_ON_DELIVERY: ["Finish the current delivery first.", "Terminez d'abord la livraison en cours."],
  NOT_VERIFIED: ["Your rider account must be verified first.", "Votre compte livreur doit d'abord être vérifié."],
  TOO_MANY_ZONES: ["Choose up to 10 delivery areas.", "Choisissez jusqu'à 10 zones."],
  NOT_A_VENDOR: ["Only shop owners can invite riders.", "Seuls les propriétaires de boutique peuvent inviter."],
  TOO_MANY_OPEN_INVITES: ["You have too many open invitations.", "Vous avez trop d'invitations ouvertes."],
  INVITE_INVALID: ["This invitation code is not valid.", "Ce code d'invitation n'est pas valide."],
  SUSPENDED_BY_VENDOR: ["This shop has suspended you.", "Cette boutique vous a suspendu."],
  INVALID_PATH: ["The document could not be saved.", "Le document n'a pas pu être enregistré."],
  METHOD_NOT_ALLOWED: ["This shop does not offer that delivery method.", "Cette boutique ne propose pas ce mode de livraison."],
  OFFER_EXPIRED: ["This offer has expired.", "Cette proposition a expiré."],
  BAD_MODE: ["That option is not available for this delivery.", "Cette option n'est pas disponible pour cette livraison."],
  NO_METHOD: ["Keep at least one delivery method switched on.", "Gardez au moins un mode de livraison actif."],
  RIDER_DETAILS_MISSING: ["The customer has not added their rider's details yet.", "Le client n'a pas encore ajouté les informations de son livreur."],
  CODE_ALREADY_USED: ["The handover code was already used.", "Le code de remise a déjà été utilisé."],
};

export function dispatchError(e: unknown, fr: boolean): string {
  const msg = (e as { message?: string })?.message ?? "";
  const key = Object.keys(ERRORS).find((k) => msg.includes(k));
  if (key) return ERRORS[key]![fr ? 1 : 0];
  return fr ? "Une erreur est survenue. Réessayez." : "Something went wrong. Please try again.";
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export function useMe() {
  return useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
    staleTime: 60_000,
  });
}

const JOB_COLS =
  "id,vendor_id,customer_id,rider_user_id,status,fulfillment_mode,pickup_address,dropoff_address,notes,fee_amount,approved_fee_amount,quote_approved_at,offer_expires_at,created_at,updated_at";

export function useJobs(role: "customer" | "vendor" | "rider" | "all", uid: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-jobs", role, uid],
    enabled: role === "all" || !!uid,
    refetchInterval: 15_000,
    queryFn: async () => {
      let q = sb.from("dispatch_jobs").select(JOB_COLS).order("created_at", { ascending: false }).limit(200);
      if (role === "customer") q = q.eq("customer_id", uid);
      if (role === "vendor") q = q.eq("vendor_id", uid);
      if (role === "rider") q = q.eq("rider_user_id", uid);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DispatchJob[];
    },
  });
}

export function useJobEvents(jobId: string | null) {
  return useQuery({
    queryKey: ["dispatch-events", jobId],
    enabled: !!jobId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_job_events")
        .select("id,delivery_id,status,actor_type,note,created_at")
        .eq("delivery_id", jobId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DispatchEvent[];
    },
  });
}

const RIDER_COLS =
  "user_id,full_name,phone,city,vehicle_type,vehicle_plate,vehicle_model,vehicle_color,licence_number,verification_status,verification_note,is_active,availability_status,service_zones,created_at";

export function useMyRider(uid: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-my-rider", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await sb.from("dispatch_riders").select(RIDER_COLS).eq("user_id", uid).maybeSingle();
      if (error) throw error;
      return (data ?? null) as RiderRow | null;
    },
  });
}

export function useRiders(filter?: { status?: string }) {
  return useQuery({
    queryKey: ["dispatch-riders", filter?.status ?? "all"],
    queryFn: async () => {
      let q = sb.from("dispatch_riders").select(RIDER_COLS).order("created_at", { ascending: false }).limit(300);
      if (filter?.status) q = q.eq("verification_status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RiderRow[];
    },
  });
}

export function useTeam(vendorId: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-team", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_vendor_riders")
        .select("id,vendor_id,rider_user_id,status,accepted_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
}

export function useMyShops(riderId: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-my-shops", riderId],
    enabled: !!riderId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_vendor_riders")
        .select("id,vendor_id,rider_user_id,status,accepted_at")
        .eq("rider_user_id", riderId);
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });
}

export function useRiderDocs(riderId: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-docs", riderId],
    enabled: !!riderId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_rider_documents")
        .select("id,rider_user_id,doc_type,storage_path,created_at")
        .eq("rider_user_id", riderId);
      if (error) throw error;
      return (data ?? []) as RiderDoc[];
    },
  });
}

export function useIsShopOwner(uid: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-is-shop", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await sb.from("provider_profiles").select("id,business_name").eq("user_id", uid).limit(1);
      return ((data ?? [])[0] ?? null) as { id: string; business_name: string | null } | null;
    },
  });
}

/** Display names via the public profile view (no private data). */
export function useNames(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[])).sort();
  return useQuery({
    queryKey: ["dispatch-names", unique.join(",")],
    enabled: unique.length > 0,
    queryFn: async () => {
      const [people, shops] = await Promise.all([
        sb.from("public_profiles").select("user_id,full_name,username").in("user_id", unique),
        sb.from("provider_profiles").select("user_id,business_name").in("user_id", unique),
      ]);
      const map: Record<string, string> = {};
      for (const p of people.data ?? []) map[p.user_id] = p.full_name || p.username || "Member";
      for (const s of shops.data ?? []) if (s.business_name) map[s.user_id] = s.business_name;
      return map;
    },
  });
}

export function useInvalidateDispatch() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["dispatch-jobs", "dispatch-events", "dispatch-my-rider", "dispatch-riders", "dispatch-team", "dispatch-my-shops", "dispatch-docs", "dispatch-prefs", "dispatch-directory", "dispatch-external"])
      void qc.invalidateQueries({ queryKey: [k] });
  };
}

/** Private upload into the rider's own folder, then record it through the checked action. */
export async function uploadRiderDoc(userId: string, docType: RiderDocType, file: File): Promise<void> {
  const check = validateRiderDoc(file);
  if (check !== "OK") throw new Error(check);
  const path = riderDocPath(userId, docType, file.type);
  const { error } = await supabase.storage.from(RIDER_DOC_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  await rpc("dispatch_rider_add_document", { _doc_type: docType, _path: path });
}

/** Short-lived link (max 60 s). Storage rules allow only the owner and ASH staff. */
export async function signedDocUrl(path: string, seconds = 60): Promise<string> {
  const { data, error } = await supabase.storage.from(RIDER_DOC_BUCKET).createSignedUrl(path, clampSignedUrlSeconds(seconds));
  if (error || !data?.signedUrl) throw error ?? new Error("NO_URL");
  return data.signedUrl;
}

export type DeliveryMode = "ASH_DISPATCH" | "CHOSEN_RIDER" | "EXTERNAL_RIDER" | "VENDOR_DISPATCH" | "SELF_PICKUP";
export type VendorPrefs = {
  allow_ash_dispatch: boolean;
  allow_chosen_rider: boolean;
  allow_external_rider: boolean;
  allow_vendor_riders: boolean;
  allow_self_pickup: boolean;
};
export const DEFAULT_PREFS: VendorPrefs = {
  allow_ash_dispatch: true,
  allow_chosen_rider: false,
  allow_external_rider: false,
  allow_vendor_riders: false,
  allow_self_pickup: true,
};

/** Methods a shop accepts, in display order. Mirrors dispatch_mode_allowed on the server. */
export function allowedModes(p: VendorPrefs): DeliveryMode[] {
  const out: DeliveryMode[] = [];
  if (p.allow_ash_dispatch) out.push("ASH_DISPATCH");
  if (p.allow_chosen_rider) out.push("CHOSEN_RIDER");
  if (p.allow_external_rider) out.push("EXTERNAL_RIDER");
  if (p.allow_vendor_riders) out.push("VENDOR_DISPATCH");
  if (p.allow_self_pickup) out.push("SELF_PICKUP");
  return out;
}

export function useVendorPrefs(vendorId: string | null | undefined) {
  return useQuery({
    queryKey: ["dispatch-prefs", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_vendor_prefs")
        .select("allow_ash_dispatch,allow_chosen_rider,allow_external_rider,allow_vendor_riders,allow_self_pickup")
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_PREFS) as VendorPrefs;
    },
  });
}

export type DirectoryRider = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  vehicle_type: string | null;
  city: string | null;
  service_zones: string[];
  availability_status: string;
};
/** Safe directory: verified, active, available riders only; no private fields. */
export function useRiderDirectory(enabled: boolean, city?: string) {
  return useQuery({
    queryKey: ["dispatch-directory", city ?? ""],
    enabled,
    refetchInterval: 30_000,
    queryFn: () => rpc<DirectoryRider[]>("dispatch_rider_directory", { _city: city?.trim() || null }),
  });
}

export type ExternalRider = { delivery_id: string; full_name: string; phone: string; vehicle_type: string; vehicle_plate: string | null; note: string | null; picked_up_at: string | null };
export function useExternalRider(jobId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["dispatch-external", jobId],
    enabled: enabled && !!jobId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("dispatch_external_riders")
        .select("delivery_id,full_name,phone,vehicle_type,vehicle_plate,note,picked_up_at")
        .eq("delivery_id", jobId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ExternalRider | null;
    },
  });
}
