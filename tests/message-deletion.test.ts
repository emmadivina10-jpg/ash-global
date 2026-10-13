import { describe, expect, it } from "vitest";
import { canDeleteForEveryone, messageDeletionKey, readHiddenMessages } from "../src/components/refer/message-deletion";
describe("message deletion choices", () => {
  it("allows delete for everyone only for the sender", () => {
    expect(canDeleteForEveryone("alice", "alice")).toBe(true);
    expect(canDeleteForEveryone("alice", "bob")).toBe(false);
    expect(canDeleteForEveryone("alice", undefined)).toBe(false);
  });
  it("keeps delete for me separate between members and conversations", () => {
    expect(messageDeletionKey("alice", "chat-1")).not.toBe(messageDeletionKey("bob", "chat-1"));
    expect(messageDeletionKey("alice", "chat-1")).not.toBe(messageDeletionKey("alice", "chat-2"));
  });
  it("restores only valid personally hidden message IDs", () => {
    expect(readHiddenMessages('["m1", "m1", 42, "m2"]')).toEqual(["m1", "m2"]);
    expect(readHiddenMessages("broken")).toEqual([]);
    expect(readHiddenMessages(null)).toEqual([]);
  });
});
