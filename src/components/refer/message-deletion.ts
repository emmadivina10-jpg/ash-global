export function messageDeletionKey(userId: string, conversationId: string) {
  return `ash-hidden-messages-v1:${userId}:${conversationId}`;
}
export function readHiddenMessages(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}
export function canDeleteForEveryone(senderId: string, userId: string | undefined) {
  return Boolean(userId && senderId === userId);
}
