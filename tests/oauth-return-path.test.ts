import { describe, expect, it } from "vitest";
import { callbackUrl, oauthReturnPath, pendingReturn } from "../src/lib/oauth-return-path";

describe("oauth return path", () => {
  it("keeps the consent URL with its authorization id", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc")).toBe(
      "/.lovable/oauth/consent?authorization_id=abc",
    );
  });
  it("rejects outside sites", () => {
    expect(oauthReturnPath("https://evil.example/x")).toBe("/");
    expect(oauthReturnPath("//evil.example/x")).toBe("/");
    expect(oauthReturnPath("/\\evil.example/")).toBe("/");
  });
  it("treats home as nothing to return to", () => {
    expect(pendingReturn("/")).toBeNull();
    expect(pendingReturn(undefined)).toBeNull();
  });
  it("carries the return path on the callback", () => {
    expect(callbackUrl("https://ashglogroup.company", "/.lovable/oauth/consent?authorization_id=a")).toBe(
      "https://ashglogroup.company/auth/callback?next=%2F.lovable%2Foauth%2Fconsent%3Fauthorization_id%3Da",
    );
  });
});
