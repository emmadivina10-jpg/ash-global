import { createServerFn } from "@tanstack/react-start";

type Decision = "UNDER_REVIEW" | "APPROVED" | "ADDITIONAL_INFORMATION_REQUIRED" | "REJECTED";

export const listCampusInstructorApplications = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("TRUST");
  const db = await adminClient();
  const { data, error } = await db
    .from("campus_instructor_applications")
    .select(
      "id,user_id,legal_full_name,display_name,country,city,date_of_birth,headline,bio,methodology,teaching_experience,subjects,levels,languages,teaching_modes,areas_served,years_experience,hourly_from,currency,qualifications,availability,identity_document_path,qualification_document_path,status,admin_note,submitted_at,reviewed_at",
    )
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;

  const rows = await Promise.all(
    (data ?? []).map(async (row: Record<string, unknown>) => {
      const identityPath = row["identity_document_path"] as string | null;
      const qualificationPath = row["qualification_document_path"] as string | null;
      const [identity, qualification] = await Promise.all([
        identityPath ? db.storage.from("campus-verification").createSignedUrl(identityPath, 900) : null,
        qualificationPath ? db.storage.from("campus-verification").createSignedUrl(qualificationPath, 900) : null,
      ]);
      return {
        ...row,
        identity_document_path: undefined,
        qualification_document_path: undefined,
        identityUrl: identity?.data?.signedUrl ?? null,
        qualificationUrl: qualification?.data?.signedUrl ?? null,
      };
    }),
  );
  return rows;
});

export const decideCampusInstructorApplication = createServerFn({ method: "POST" })
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
      .from("campus_instructor_applications")
      .select("id,user_id,status,display_name")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (readError || !application) throw readError ?? new Error("APPLICATION_NOT_FOUND");

    const reviewInput = {
      _application_id: application.id,
      _status: data.status,
      ...(data.note ? { _note: data.note } : {}),
      _reviewer: actor.name,
    };
    const { error: decisionError } = await db.rpc("review_campus_instructor_application", reviewInput);
    if (decisionError) throw decisionError;

    await db.from("admin_audit_log").insert({
      actor: actor.name,
      action: "CAMPUS_INSTRUCTOR_APPLICATION_DECIDED",
      previous_state: { application_id: application.id, status: application.status },
      new_state: { application_id: application.id, status: data.status, note: data.note || null },
    });

    return { ok: true };
  });
