/** Pure rules for private rider identity documents. No I/O. */
export const RIDER_DOC_BUCKET = "rider-documents";
/** Signed links to identity documents never live longer than this. */
export const SIGNED_URL_MAX_SECONDS = 60;
export const RIDER_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const RIDER_DOC_TYPES = ["NATIONAL_ID", "PASSPORT", "DRIVER_LICENCE", "VEHICLE_REGISTRATION", "SELFIE"] as const;
export type RiderDocType = (typeof RIDER_DOC_TYPES)[number];
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function clampSignedUrlSeconds(requested: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return SIGNED_URL_MAX_SECONDS;
  return Math.min(Math.floor(requested), SIGNED_URL_MAX_SECONDS);
}

export function validateRiderDoc(file: { type: string; size: number }): "OK" | "BAD_TYPE" | "TOO_LARGE" | "EMPTY" {
  if (!ALLOWED_MIME[file.type]) return "BAD_TYPE";
  if (file.size <= 0) return "EMPTY";
  if (file.size > RIDER_DOC_MAX_BYTES) return "TOO_LARGE";
  return "OK";
}

/** Every file lives in the rider's own folder with a fresh name (storage has no overwrite permission). */
export function riderDocPath(userId: string, docType: RiderDocType, mime: string, now = Date.now()): string {
  const ext = ALLOWED_MIME[mime];
  if (!ext) throw new Error("BAD_TYPE");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("BAD_USER");
  return `${userId}/${docType.toLowerCase()}-${now}.${ext}`;
}

/** Documents a rider must supply before asking for review (mirrors dispatch_rider_submit_verification). */
export function missingDocs(vehicle: string | null, have: string[]): RiderDocType[] {
  const missing: RiderDocType[] = [];
  if (!have.includes("NATIONAL_ID") && !have.includes("PASSPORT")) missing.push("NATIONAL_ID");
  if (!have.includes("SELFIE")) missing.push("SELFIE");
  if ((vehicle === "MOTORCYCLE" || vehicle === "CAR") && !have.includes("DRIVER_LICENCE")) missing.push("DRIVER_LICENCE");
  return missing;
}

/** UI mirror of the server rule: only approved, active and available riders may take work. */
export function riderCanTakeWork(r: { verification_status: string; is_active: boolean; availability_status: string } | null | undefined): boolean {
  return !!r && r.verification_status === "VERIFIED" && r.is_active && r.availability_status === "AVAILABLE";
}
