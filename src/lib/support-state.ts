type Message = { sender: string; created_at: string };
type Ticket = { status: string; messages: Message[] };

export function awaitingSupportReply(ticket: Ticket) {
  return !["RESOLVED", "CLOSED"].includes(ticket.status) && ticket.messages.at(-1)?.sender === "CUSTOMER";
}

export function unreadSupportMessages(messages: Message[], readAt: string | null) {
  return messages.filter((message) => message.sender === "CUSTOMER" && (!readAt || message.created_at > readAt)).length;
}

export function staffNotificationScope(actor: { superAdmin: boolean; staffId?: string | null; department: string }) {
  if (actor.superAdmin) return null;
  if (!actor.staffId) throw new Error("FORBIDDEN");
  return `staff_id.eq.${actor.staffId},department.eq.${actor.department}`;
}