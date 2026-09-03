import { useNotifications } from "@/lib/notifications";
import { useAppBadge, usePushNotifications } from "@/lib/push";

/**
 * Registers the device for push and mirrors backend notifications (withdrawals,
 * activation, referral commissions, bookings, chat) to the OS: vibration plus a
 * numeric badge (1, 2, 3 …) on the installed / home-screen app icon.
 */
export function PushBridge() {
  usePushNotifications();
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  useAppBadge(unread);
  return null;
}
