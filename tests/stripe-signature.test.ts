import { describe, it, expect } from "vitest";
import { verifyStripeSignature } from "../src/lib/stripe.server";

const SECRET = "whsec_testdummy123";
const PAYLOAD = '{"id":"evt_1","type":"checkout.session.completed","data":{"object":{}}}';

async function sign(payload: string, t: number): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${hex}`;
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed payload", async () => {
    const t = Math.floor(Date.now() / 1000);
    expect(await verifyStripeSignature(PAYLOAD, await sign(PAYLOAD, t), SECRET)).toBe(true);
  });
  it("rejects a tampered payload", async () => {
    const t = Math.floor(Date.now() / 1000);
    const header = await sign(PAYLOAD, t);
    expect(await verifyStripeSignature(PAYLOAD + " ", header, SECRET)).toBe(false);
  });
  it("rejects an old timestamp", async () => {
    const t = Math.floor(Date.now() / 1000) - 600;
    expect(await verifyStripeSignature(PAYLOAD, await sign(PAYLOAD, t), SECRET)).toBe(false);
  });
  it("rejects missing header", async () => {
    expect(await verifyStripeSignature(PAYLOAD, null, SECRET)).toBe(false);
  });
});
