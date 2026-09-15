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
    const body = fr
      ? `Bonjour ${businessName} ! J’ai vu « ${subject} » sur ASH Glo. Je suis intéressé(e) et j’aimerais connaître le prix, la disponibilité et la façon de procéder.`
      : `Hi ${businessName}! I saw "${subject}" on ASH Glo. I’m interested and would like to know the price, availability and how to proceed.`;

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
