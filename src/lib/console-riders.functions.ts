import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Staff console: list ASH Logistics riders with short-lived document links. */
export const getConsoleRiders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data: riders, error } = await db
    .from("dispatch_riders")
    .select(
      "user_id, full_name, phone, city, vehicle_type, vehicle_plate, vehicle_model, vehicle_color, licence_number, verification_status, verification_note, verified_at, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error("RIDERS_UNAVAILABLE");
  const ids = (riders ?? []).map((r) => r.user_id);
  const { data: docs, error: docErr } = ids.length
    ? await db
        .from("dispatch_rider_documents")
        .select("id, rider_user_id, doc_type, storage_path, created_at")
        .in("rider_user_id", ids)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (docErr) throw new Error("RIDERS_UNAVAILABLE");
  const withLinks = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await db.storage.from("rider-documents").createSignedUrl(d.storage_path, 60);
      const isPdf = d.storage_path.toLowerCase().endsWith(".pdf");
      return { id: d.id, rider_user_id: d.rider_user_id, doc_type: d.doc_type, created_at: d.created_at, url: data?.signedUrl ?? null, isPdf };
    }),
  );
  return (riders ?? []).map((r) => ({
    ...r,
    documents: withLinks.filter((d) => d.rider_user_id === r.user_id),
  }));
});

const ReviewInput = z.object({
  riderId: z.string().uuid(),
  decision: z.enum(["VERIFIED", "REJECTED", "SUSPENDED", "REINSTATE"]),
  note: z.string().max(500).optional(),
});

/** Same rules as dispatch_rider_review, enforced for Trust/Operations staff seats. */
export const reviewConsoleRider = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("TRUST", "OPERATIONS");
    const db = await adminClient();
    const { data: r, error } = await db
      .from("dispatch_riders")
      .select("verification_status")
      .eq("user_id", data.riderId)
      .maybeSingle();
    if (error || !r) throw new Error("NOT_REGISTERED");
    const note = (data.note ?? "").trim();
    let decision: string = data.decision;
    if ((decision === "VERIFIED" || decision === "REJECTED") && r.verification_status !== "PENDING")
      throw new Error("INVALID_STATUS");
    if ((decision === "REJECTED" || decision === "SUSPENDED") && note.length < 3)
      throw new Error("NOTE_REQUIRED");
    if (decision === "REINSTATE") {
      if (r.verification_status !== "SUSPENDED") throw new Error("INVALID_STATUS");
      decision = "VERIFIED";
    }
    if (decision === "SUSPENDED") {
      const { count } = await db
        .from("dispatch_job_assignments")
        .select("id", { count: "exact", head: true })
        .eq("rider_user_id", data.riderId)
        .in("status", ["ACCEPTED", "IN_PROGRESS"]);
      if ((count ?? 0) > 0) throw new Error("RIDER_ON_DELIVERY");
    }
    const { error: upErr } = await db
      .from("dispatch_riders")
      .update({
        verification_status: decision,
        verification_note: note || null,
        verified_by: null,
        verified_at: new Date().toISOString(),
        is_active: decision === "VERIFIED",
        availability_status: "OFFLINE",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.riderId);
    if (upErr) throw new Error("REVIEW_FAILED");
    return { ok: true };
  });
