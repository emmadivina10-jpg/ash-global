import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-person chat preferences: pinned, archived and locked chats, plus the
 * PIN that unlocks the hidden ones. The PIN is hashed before it ever leaves
 * the phone, so the digits are never stored.
 */

export type ChatPref = { pinned: boolean; archived: boolean; locked: boolean };

export const MAX_PINNED = 2;

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`ash-chat-lock:${pin.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useChatPrefs() {
  return useQuery({
    queryKey: ["chat-prefs"],
    staleTime: 15_000,
    queryFn: async (): Promise<Record<string, ChatPref>> => {
      const userId = await currentUserId();
      if (!userId) return {};
      const { data } = await supabase
        .from("conversation_prefs")
        .select("conversation_id, pinned, archived, locked")
        .eq("user_id", userId);
      const out: Record<string, ChatPref> = {};
      for (const row of (data ?? []) as {
        conversation_id: string;
        pinned: boolean;
        archived: boolean;
        locked: boolean;
      }[]) {
        out[row.conversation_id] = {
          pinned: row.pinned,
          archived: row.archived,
          locked: row.locked,
        };
      }
      return out;
    },
  });
}

export function useSetChatPref() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      patch,
    }: {
      conversationId: string;
      patch: Partial<ChatPref>;
    }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from("conversation_prefs")
        .upsert(
          { user_id: userId, conversation_id: conversationId, ...patch },
          { onConflict: "user_id,conversation_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-prefs"] }),
  });
}

/** Removes a conversation for good when the rules allow it. */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-prefs"] });
    },
  });
}

/** The stored (hashed) chat-lock PIN for the signed-in member. */
export function useChatLockPin() {
  return useQuery({
    queryKey: ["chat-lock-pin"],
    staleTime: 60_000,
    queryFn: async (): Promise<string | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data } = await supabase
        .from("chat_settings")
        .select("lock_pin")
        .eq("user_id", userId)
        .maybeSingle();
      return ((data as { lock_pin?: string | null } | null)?.lock_pin) ?? null;
    },
  });
}

export function useSetChatLockPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string | null) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("You need to be signed in.");
      const lock_pin = pin ? await hashPin(pin) : null;
      const { error } = await supabase
        .from("chat_settings")
        .upsert({ user_id: userId, lock_pin }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["chat-lock-pin"] }),
  });
}
