/**
 * RLS regression suite — anonymous (signed-out) access.
 *
 * These tests lock in the fix for the "Public Can Execute SECURITY DEFINER
 * Function" finding: an unauthenticated visitor must not be able to call the
 * availability helper, nor infer a provider's booked-out times by reading the
 * bookings table directly.
 *
 * They run against the live project using ONLY the publishable (anon) key, so
 * they exercise exactly what a stranger on the internet can reach.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

config({ path: ".env", quiet: true });

const URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const ANON_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  process.env["SUPABASE_PUBLISHABLE_KEY"] ??
  "";

/** Anonymous client: no session, no bearer token — a plain visitor. */
const anon = createClient(URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (ANON_KEY.startsWith("sb_") && headers.get("Authorization") === `Bearer ${ANON_KEY}`) {
        headers.delete("Authorization");
      }
      headers.set("apikey", ANON_KEY);
      return fetch(input, { ...init, headers });
    },
  },
});

let liveProviderId: string | null = null;

beforeAll(async () => {
  expect(URL, "VITE_SUPABASE_URL must be set").not.toBe("");
  expect(ANON_KEY, "publishable key must be set").not.toBe("");

  // A real live provider makes the probes meaningful rather than vacuous.
  const { data } = await anon.from("provider_profiles").select("id").eq("is_live", true).limit(1);
  liveProviderId = data?.[0]?.id ?? null;
});

describe("provider_slots is not reachable anonymously", () => {
  it("refuses the availability RPC for a signed-out caller", async () => {
    const { data, error } = await anon.rpc("provider_slots", {
      _provider_id: liveProviderId ?? "00000000-0000-0000-0000-000000000000",
      _date: new Date().toISOString().slice(0, 10),
      _duration: 60,
    });

    expect(error, "anonymous callers must be rejected, not served").not.toBeNull();
    expect(error?.message ?? "").toMatch(/permission denied|not find the function|does not exist/i);
    expect(data).toBeNull();
  });

  it("refuses the RPC no matter which provider id is probed", async () => {
    const probes = [
      "00000000-0000-0000-0000-000000000000",
      liveProviderId ?? "11111111-1111-1111-1111-111111111111",
    ];
    for (const id of probes) {
      const { error } = await anon.rpc("provider_slots", {
        _provider_id: id,
        _date: "2030-01-01",
        _duration: 30,
      });
      expect(error, `provider ${id} must not be probeable`).not.toBeNull();
    }
  });
});

describe("booking availability cannot be inferred anonymously", () => {
  it("returns no booking rows to a signed-out caller", async () => {
    const { data, error } = await anon.from("bookings").select("id, scheduled_at, provider_id").limit(5);
    // Either the grant is missing (error) or RLS filters everything (empty).
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("does not leak booked times when filtering by a real provider", async () => {
    if (!liveProviderId) return;
    const { data, error } = await anon
      .from("bookings")
      .select("scheduled_at")
      .eq("provider_id", liveProviderId)
      .limit(50);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("refuses anonymous booking creation", async () => {
    const { error } = await anon.from("bookings").insert({
      client_id: "00000000-0000-0000-0000-000000000000",
      provider_id: liveProviderId ?? "00000000-0000-0000-0000-000000000000",
      service_title: "rls-regression-probe",
      price: 1,
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    } as never);
    expect(error, "anonymous inserts into bookings must fail").not.toBeNull();
  });

  it("refuses the anonymous booking request RPC", async () => {
    const { data } = await anon.rpc("request_booking", {
      _provider_id: liveProviderId ?? "00000000-0000-0000-0000-000000000000",
      _service_id: "00000000-0000-0000-0000-000000000000",
      _scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });
    // Either the grant blocks it outright, or the function reports no session.
    if (data) expect((data as { error?: string }).error).toBe("UNAUTHENTICATED");
  });
});

describe("security tooling is not exposed to visitors", () => {
  it("hides the security audit log", async () => {
    const { data, error } = await anon.from("security_events").select("id").limit(1);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("hides the throttling counters", async () => {
    const { data, error } = await anon.from("rate_limit_hits").select("bucket").limit(1);
    if (!error) expect(data ?? []).toHaveLength(0);
  });

  it("refuses the privileged helper RPCs", async () => {
    for (const fn of ["security_selfcheck", "console_financials", "console_counts", "rate_limit_check"]) {
      const { error } = await anon.rpc(fn as never, {} as never);
      expect(error, `${fn} must not be callable anonymously`).not.toBeNull();
    }
  });
});

describe("privileged roles cannot be enumerated anonymously", () => {
  it("refuses has_role for signed-out callers", async () => {
    const { data, error } = await anon.rpc("has_role" as never, {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _role: "admin",
    } as never);
    expect(error, "has_role must not be callable anonymously").not.toBeNull();
    expect(data).toBeNull();
  });
});
