import { createHash, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

export type ConsoleSession = { unlocked?: boolean };

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

export async function isUnlocked(): Promise<boolean> {
  const session = await useSession<ConsoleSession>(sessionConfig());
  return Boolean(session.data.unlocked);
}

/** Throws when the console session is missing. Never returns data to a locked caller. */
export async function requireConsole() {
  if (!(await isUnlocked())) throw new Error("CONSOLE_LOCKED");
}

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
