import { useNotifications } from "@/lib/notifications";
import { useAppBadge, usePushNotifications } from "@/lib/push";

/**
 * Registers the device for push and mirrors backend notifications (withdrawals,
 * activation, referral commissions, bookings, chat) to the OS: vibration plus a
 * numeric badge on the installed / home-screen app icon. Notification banners
 * belong to the OS, not a second in-app toast.
 */
export function PushBridge() {
  usePushNotifications(true);
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  useAppBadge(unread);
  return null;
}
