import { describe, expect, it } from "vitest";
import { findSellerConversation } from "../src/lib/conversation-match";
describe("seller chat continuity", () => {
 it("reuses an existing member chat", () => { expect(findSellerConversation([{id:"old",client_id:"buyer",owner_id:"seller"}],"buyer","seller","store")?.id).toBe("old"); });
 it("reuses seller-initiated chats", () => { expect(findSellerConversation([{id:"reverse",client_id:"seller",owner_id:"buyer"}],"buyer","seller","store")?.id).toBe("reverse"); });
 it("reuses storefront chats", () => { expect(findSellerConversation([{id:"store-chat",client_id:"buyer",provider_id:"store"}],"buyer","seller","store")?.id).toBe("store-chat"); });
 it("creates only when no matching direct conversation exists", () => { expect(findSellerConversation([{id:"group",client_id:"buyer",owner_id:"seller",group_id:"g"},{id:"other",client_id:"other",provider_id:"store"}],"buyer","seller","store")).toBeUndefined(); });
});
