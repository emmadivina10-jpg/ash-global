import { describe, expect, it } from "vitest";
import { awaitingSupportReply, unreadSupportMessages, staffNotificationScope } from "../src/lib/support-state";

describe("Support notification lifecycle", () => {
  const messages = [{ sender: "CUSTOMER", created_at: "2026-10-10T06:00:00Z" }];
  it("resolved conversations no longer await a reply", () => {
    expect(awaitingSupportReply({ status: "RESOLVED", messages })).toBe(false);
    expect(awaitingSupportReply({ status: "OPEN", messages })).toBe(true);
  });
  it("a reply clears awaiting status", () => {
    expect(awaitingSupportReply({ status: "PENDING", messages: [...messages, { sender: "ADMIN", created_at: "2026-10-10T06:01:00Z" }] })).toBe(false);
  });
  it("reading clears old messages but not later arrivals", () => {
    expect(unreadSupportMessages(messages, "2026-10-10T06:00:00Z")).toBe(0);
    expect(unreadSupportMessages([...messages, { sender: "CUSTOMER", created_at: "2026-10-10T06:02:00Z" }], "2026-10-10T06:01:00Z")).toBe(1);
  });
  it("staff reads are scoped and unknown staff fail closed", () => {
    expect(staffNotificationScope({ superAdmin: false, staffId: "staff-1", department: "SUPPORT" })).toBe("staff_id.eq.staff-1,department.eq.SUPPORT");
    expect(() => staffNotificationScope({ superAdmin: false, department: "SUPPORT" })).toThrow("FORBIDDEN");
    expect(staffNotificationScope({ superAdmin: true, department: "SUPER_ADMIN" })).toBeNull();
  });
});