import { usePushNotifications } from "@/lib/push";

/**
 * Registers the device for push and mirrors backend notifications (withdrawals,
 * activation, referral commissions, bookings, chat) to the OS. Renders nothing.
 */
export function PushBridge() {
  usePushNotifications();
  return null;
}
