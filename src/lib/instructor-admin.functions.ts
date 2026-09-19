import { createServerFn } from "@tanstack/react-start";

type Decision = "UNDER_REVIEW" | "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

export const listFxInstructorApplications = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("TRUST");
  const db = await adminClient();
  const { data, error } = await db
    .from("fx_instructor_applications")
    .select("id,user_id,legal_full_name,display_name,country,date_of_birth,profile_summary,trading_experience,years_experience,expertise,trading_background,government_id_type,government_id_path,selfie_path,status,admin_note,kyc_provider,kyc_reference,kyc_status,submitted_at,reviewed_at")
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = await Promise.all((data ?? []).map(async (row) => {
    const [idUrl, selfieUrl] = await Promise.all([
      db.storage.from("market-verification").createSignedUrl(row.government_id_path, 900),
      db.storage.from("market-verification").createSignedUrl(row.selfie_path, 900),
    ]);
    return {
      ...row,
      government_id_path: undefined,
      selfie_path: undefined,
      governmentIdUrl: idUrl.data?.signedUrl ?? null,
      selfieUrl: selfieUrl.data?.signedUrl ?? null,
    };
  }));
  return rows;
});

export const decideFxInstructorApplication = createServerFn({ method: "POST" })
  .inputValidator((input: { applicationId: string; status: Decision; note?: string }) => ({
    applicationId: String(input?.applicationId ?? "").slice(0, 64),
    status: String(input?.status ?? "UNDER_REVIEW") as Decision,
    note: String(input?.note ?? "").trim().slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const allowed: Decision[] = ["UNDER_REVIEW", "APPROVED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED"];
    if (!allowed.includes(data.status)) throw new Error("INVALID_STATUS");
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("TRUST");
    const db = await adminClient();
    const { data: application, error: readError } = await db
      .from("fx_instructor_applications")
      .select("id,user_id,profile_summary,trading_experience,expertise,status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (readError || !application) throw readError ?? new Error("APPLICATION_NOT_FOUND");

    const { error: decisionError } = await db.rpc("review_fx_instructor_application", {
      _application_id: application.id,
      _status: data.status,
      _note: data.note || undefined,
    });
    if (decisionError) throw decisionError;

    await db.from("admin_audit_log").insert({
      actor: actor.name,
      action: "FX_INSTRUCTOR_APPLICATION_DECIDED",
      previous_state: { application_id: application.id, status: application.status },
      new_state: { application_id: application.id, status: data.status, note: data.note || null },
    });
    return { ok: true as const };
  });
