import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), neq: vi.fn(), is: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
import { fetchUnreadMessageCount } from "../src/lib/message-unread";
describe("Messages tab unread count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.from.mockReturnValue(db);
    db.select.mockReturnValue(db);
    db.neq.mockReturnValue(db);
  });
  it("counts incoming unread messages, not the member's own or read messages", async () => {
    db.is.mockResolvedValue({ count: 7, error: null });
    expect(await fetchUnreadMessageCount("member-a")).toBe(7);
    expect(db.from).toHaveBeenCalledWith("messages");
    expect(db.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(db.neq).toHaveBeenCalledWith("sender_id", "member-a");
    expect(db.is).toHaveBeenCalledWith("read_at", null);
  });
  it("clears when no unread messages remain", async () => {
    db.is.mockResolvedValue({ count: 0, error: null });
    expect(await fetchUnreadMessageCount("member-a")).toBe(0);
  });
  it("does not silently report zero when a count request fails", async () => {
    db.is.mockResolvedValue({ count: null, error: new Error("offline") });
    await expect(fetchUnreadMessageCount("member-a")).rejects.toThrow("offline");
  });
});
