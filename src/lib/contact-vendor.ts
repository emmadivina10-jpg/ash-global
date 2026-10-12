import { supabase } from "@/integrations/supabase/client";
import { openConversation } from "@/lib/marketplace.queries";

/**
 * Opens (or reuses) a conversation with a storefront and, when the thread is
 * brand new, sends a friendly opening message that says hello and why the
 * member is reaching out. Returns the conversation id, or null when there is
 * no storefront to contact.
 */
export async function contactVendor(options: {
  providerId: string | null | undefined;
  businessName?: string | null;
  /** What the member is interested in: a service, listing, deal or product. */
  subject?: string | null;
  fr?: boolean;
  source?: string;
  /** Overrides the default opener with a tailored first message. */
  message?: string | null;
}): Promise<string | null> {
  const providerId = options.providerId?.trim();
  if (!providerId) return null;

  const conversationId = await openConversation(providerId);
  if (!conversationId) return null;

  try {
    const { data: existing, error } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1);
    if (error || (existing ?? []).length > 0) return conversationId;

    const { data: auth } = await supabase.auth.getUser();
    const senderId = auth.user?.id;
    if (!senderId) return conversationId;

    const fr = options.fr === true;
    const businessName = options.businessName?.trim() || (fr ? "bonjour" : "there");
    const subject = options.subject?.trim() || (fr ? "votre offre" : "your offer");
    const body = options.message?.trim() || (fr
      ? `Bonjour ${businessName} ! J’ai vu « ${subject} » sur ASH Glo. Je suis intéressé(e) et j’aimerais connaître le prix, la disponibilité et la façon de procéder.`
      : `Hi ${businessName}! I saw "${subject}" on ASH Glo. I’m interested and would like to know the price, availability and how to proceed.`);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      metadata: { source: options.source ?? "ash_contact", subject },
    });
  } catch {
    // The conversation still opens even if the optional opener fails.
  }

  return conversationId;
}

/**
 * Sends a first "hello + why I'm reaching out" message into a conversation
 * that has no messages yet. Safe to call on an existing thread — it stays
 * quiet when the conversation already started.
 */
export async function sendOpeningMessage(conversationId: string, body: string): Promise<void> {
  try {
    const { data: existing, error } = await supabase
      .from("messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .limit(1);
    if (error || (existing ?? []).length > 0) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      body,
      metadata: { source: "ash_contact" },
    });
  } catch {
    /* optional opener */
  }
}

/**
 * Opens (or reuses) a direct member-to-member conversation — used when a
 * Spotlight post comes from someone who has no business storefront.
 */
export async function openMemberConversation(memberId: string | null | undefined): Promise<string | null> {
  const otherId = memberId?.trim();
  if (!otherId) return null;
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me || me === otherId) return null;

  const { data: existing, error: lookupError } = await supabase
    .from("conversations")
    .select("id")
    .is("group_id", null)
    .or(`and(client_id.eq.${me},owner_id.eq.${otherId}),and(client_id.eq.${otherId},owner_id.eq.${me})`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing?.[0]?.id) return existing[0].id;

  // Storefront chats created before owner_id was populated remain reusable.
  const { data: storefronts, error: storeError } = await supabase
    .from("provider_profiles").select("id, user_id").in("user_id", [me, otherId]);
  if (storeError) throw storeError;
  if (storefronts?.length) {
    const { data: threads, error: threadError } = await supabase
      .from("conversations").select("id, client_id, provider_id")
      .is("group_id", null)
      .in("provider_id", storefronts.map((store) => store.id))
      .in("client_id", [me, otherId])
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (threadError) throw threadError;
    const matched = threads?.find((thread) => storefronts.some((store) =>
      store.id === thread.provider_id &&
      ((store.user_id === otherId && thread.client_id === me) ||
       (store.user_id === me && thread.client_id === otherId))));
    if (matched) return matched.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: me, owner_id: otherId })
    .select("id")
    .single();
  if (error) return null;
  return created.id;
}
