import { createServerFn } from "@tanstack/react-start";

export type StaffSeat = {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  department: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  targets: {
    contacts_target: number;
    recruits_target: number;
    deals_target: number;
    revenue_target: number;
  } | null;
};

export const listStaff = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("SUPER_ADMIN");
  const db = await adminClient();
  const [seats, targets] = await Promise.all([
    db
      .from("staff_accounts")
      .select("id, full_name, username, email, phone, department, is_active, last_login_at, created_at")
      .order("created_at", { ascending: true }),
    db.from("staff_targets").select("*").eq("period", "DAILY"),
  ]);
  const map = new Map((targets.data ?? []).map((t) => [t.staff_id, t]));
  return (seats.data ?? []).map((s) => ({
    ...s,
    targets: map.get(s.id)
      ? {
          contacts_target: map.get(s.id)!.contacts_target,
          recruits_target: map.get(s.id)!.recruits_target,
          deals_target: map.get(s.id)!.deals_target,
          revenue_target: map.get(s.id)!.revenue_target,
        }
      : null,
  })) as StaffSeat[];
});

export const createStaffSeat = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      fullName: string;
      username: string;
      password: string;
      department: string;
      email?: string;
      phone?: string;
    }) => ({
      fullName: String(data?.fullName ?? "").trim().slice(0, 120),
      username: String(data?.username ?? "").trim().toLowerCase().slice(0, 60),
      password: String(data?.password ?? ""),
      department: String(data?.department ?? "SUPPORT").toUpperCase(),
      email: String(data?.email ?? "").trim().toLowerCase().slice(0, 200) || null,
      phone: String(data?.phone ?? "").trim().slice(0, 40) || null,
    }),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient, hashStaffPassword, DEPARTMENTS } = await import(
      "./console.server"
    );
    await requireSuperAdmin();
    if (!data.fullName || !data.username || data.password.length < 8) {
      return { ok: false as const, error: "Name, username and an 8+ character password are required." };
    }
    if (!(DEPARTMENTS as readonly string[]).includes(data.department)) {
      return { ok: false as const, error: "Unknown department." };
    }
    const db = await adminClient();
    const { error } = await db.from("staff_accounts").insert({
      full_name: data.fullName,
      username: data.username,
      email: data.email,
      phone: data.phone,
      department: data.department,
      password_hash: hashStaffPassword(data.password),
    });
    if (error) {
      return {
        ok: false as const,
        error: error.code === "23505" ? "That username is already taken." : error.message,
      };
    }
    return { ok: true as const };
  });

export const updateStaffSeat = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      department?: string;
      isActive?: boolean;
      password?: string;
      fullName?: string;
      email?: string;
      phone?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient, hashStaffPassword, DEPARTMENTS } = await import(
      "./console.server"
    );
    await requireSuperAdmin();
    const patch: Record<string, unknown> = {};
    if (data.fullName) patch["full_name"] = String(data.fullName).slice(0, 120);
    if (data.email !== undefined) patch["email"] = String(data.email).trim().toLowerCase() || null;
    if (data.phone !== undefined) patch["phone"] = String(data.phone).trim() || null;
    if (data.department) {
      const dept = String(data.department).toUpperCase();
      if (!(DEPARTMENTS as readonly string[]).includes(dept)) {
        return { ok: false as const, error: "Unknown department." };
      }
      patch["department"] = dept;
    }
    if (typeof data.isActive === "boolean") patch["is_active"] = data.isActive;
    if (data.password) {
      if (data.password.length < 8) return { ok: false as const, error: "Password must be 8+ characters." };
      patch["password_hash"] = hashStaffPassword(data.password);
    }
    if (!Object.keys(patch).length) return { ok: true as const };
    const db = await adminClient();
    const { error } = await db.from("staff_accounts").update(patch as never).eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const setStaffTargets = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      staffId: string;
      contacts: number;
      recruits: number;
      deals: number;
      revenue: number;
    }) => ({
      staffId: String(data?.staffId ?? ""),
      contacts: Math.max(0, Number(data?.contacts ?? 0) | 0),
      recruits: Math.max(0, Number(data?.recruits ?? 0) | 0),
      deals: Math.max(0, Number(data?.deals ?? 0) | 0),
      revenue: Math.max(0, Number(data?.revenue ?? 0) | 0),
    }),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    await requireSuperAdmin();
    const db = await adminClient();
    const { error } = await db.from("staff_targets").upsert(
      {
        staff_id: data.staffId,
        period: "DAILY",
        contacts_target: data.contacts,
        recruits_target: data.recruits,
        deals_target: data.deals,
        revenue_target: data.revenue,
      },
      { onConflict: "staff_id,period" },
    );
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });
