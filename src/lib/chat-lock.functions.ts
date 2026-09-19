import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export type LockedChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kind: string | null;
  metadata: Json | null;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The only path that can read a member's locked thread. Authentication,
 * participation, the member-owned lock flag and the PIN are all checked on
 * the server before the service-role query runs.
 */
export const unlockChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string; pin: string }) => ({
    conversationId: String(input?.conversationId ?? ""),
    pin: String(input?.pin ?? "").replace(/\D/g, "").slice(0, 8),
  }))
  .handler(async ({ data, context }) => {
    if (!data.conversationId || data.pin.length < 4) throw new Error("INVALID_CHAT_PIN");

    const { supabase, userId } = context;
    const [{ data: pref }, { data: settings }] = await Promise.all([
      supabase
        .from("conversation_prefs")
        .select("locked")
        .eq("user_id", userId)
        .eq("conversation_id", data.conversationId)
        .maybeSingle(),
      supabase.from("chat_settings").select("lock_pin").eq("user_id", userId).maybeSingle(),
    ]);

    // The normal RLS query intentionally cannot see a locked conversation.
    // Confirm participation with the service-role client only after proving
    // that this caller owns the lock preference and knows their PIN.
    if (!pref?.locked || !settings?.lock_pin) throw new Error("CHAT_NOT_LOCKED");
    const suppliedHash = await sha256(`ash-chat-lock:${data.pin.trim()}`);
    if (suppliedHash !== settings.lock_pin) throw new Error("INVALID_CHAT_PIN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: securedConversation } = await supabaseAdmin
      .from("conversations")
      .select("id, client_id, owner_id, provider_id, group_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!securedConversation) throw new Error("CHAT_NOT_FOUND");

    let participant = securedConversation.client_id === userId || securedConversation.owner_id === userId;
    if (!participant && securedConversation.provider_id) {
      const { data: provider } = await supabaseAdmin
        .from("provider_profiles")
        .select("user_id")
        .eq("id", securedConversation.provider_id)
        .maybeSingle();
      participant = provider?.user_id === userId;
    }
    if (!participant && securedConversation.group_id) {
      const { data: membership } = await supabaseAdmin
        .from("group_members")
        .select("id")
        .eq("group_id", securedConversation.group_id)
        .eq("user_id", userId)
        .maybeSingle();
      participant = Boolean(membership);
    }
    if (!participant) throw new Error("NOT_AUTHORIZED");

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return { conversation: securedConversation, messages: (messages ?? []) as LockedChatMessage[] };
  });