export function isReplySwipe(dx: number, dy: number) {
  return dx >= 55 && Math.abs(dy) < 30 && dx > Math.abs(dy) * 2;
}
export function replyMessageId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || !("reply_to" in metadata)) return null;
  return typeof metadata.reply_to === "string" ? metadata.reply_to : null;
}
