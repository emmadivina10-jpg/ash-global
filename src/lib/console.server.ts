import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

export const DEPARTMENTS = [
  "SUPER_ADMIN",
  "SUPPORT",
  "GROWTH",
  "SALES",
  "MARKETPLACE_OPS",
  "ADVERTISING",
  "PARTNERSHIPS",
  "CONTENT",
  "MERCHANT",
  "EXPANSION",
  "REVENUE",
  "TRUST",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export type ConsoleSession = {
  unlocked?: boolean;
  staffId?: string | null;
  staffName?: string;
  department?: Department;
  elevated?: boolean;
};

export type ConsoleActor = {
  staffId: string | null;
  name: string;
  department: Department;
  elevated: boolean;
  superAdmin: boolean;
};

export function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "ash-console",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** scrypt hash for staff seat passwords: `scrypt$<salt>$<key>`. */
export function hashStaffPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyStaffPassword(password: string, stored: string): boolean {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export async function consoleSession() {
  return useSession<ConsoleSession>(sessionConfig());
}

export async function isUnlocked(): Promise<boolean> {
  const session = await consoleSession();
  return Boolean(session.data.unlocked);
}

/** Throws when the console session is missing. Never returns data to a locked caller. */
export async function requireConsole(): Promise<ConsoleActor> {
  const session = await consoleSession();
  if (!session.data.unlocked) throw new Error("CONSOLE_LOCKED");
  const department = (session.data.department ?? "SUPER_ADMIN") as Department;
  return {
    staffId: session.data.staffId ?? null,
    name: session.data.staffName ?? "Super admin",
    department,
    elevated: Boolean(session.data.elevated),
    superAdmin: department === "SUPER_ADMIN",
  };
}

/**
 * Write guard. Every seat can read the whole console; changing anything
 * requires the owning department, super admin, or an elevated super-admin
 * session.
 */
export async function requireDepartment(...allowed: Department[]): Promise<ConsoleActor> {
  const actor = await requireConsole();
  if (actor.superAdmin || actor.elevated) return actor;
  if (allowed.includes(actor.department)) return actor;
  throw new Error("FORBIDDEN_DEPARTMENT");
}

export async function requireSuperAdmin(): Promise<ConsoleActor> {
  const actor = await requireConsole();
  if (!actor.superAdmin) throw new Error("FORBIDDEN_DEPARTMENT");
  return actor;
}

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
