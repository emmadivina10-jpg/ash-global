/**
 * Push / device notifications.
 *
 * Important account events (withdrawal decisions, activation verification,
 * referral commissions, bookings and chat) are written server-side into the
 * `notifications` table by database triggers. This module turns those rows into
 * something the member actually sees outside the app:
 *
 *  - native (Capacitor): registers the device with APNs / FCM, stores the token
 *    in `push_tokens`, and mirrors incoming events as local notifications;
 *  - web: uses the browser Notification API when the member grants permission.
 *
 * Everything degrades to a no-op when the platform or permission is missing.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "@/lib/native";

/** Categories that are important enough to interrupt the member. */
export const PUSH_CATEGORIES = [
  "WITHDRAWAL",
  "ACTIVATION",
  "COMMISSION",
  "BOOKING",
  "MESSAGE",
  "REVIEW",
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export function isPushCategory(category: string): category is PushCategory {
  return (PUSH_CATEGORIES as readonly string[]).includes(category);
}

/** Deep link for a notification payload, used when the member taps it. */
export function notificationLink(category: string, data: Record<string, unknown> = {}): string {
  switch (category) {
    case "WITHDRAWAL":
      return "/withdraw";
    case "ACTIVATION":
      return "/dashboard";
    case "COMMISSION":
      return "/network";
    case "BOOKING":
      return "/bookings";
    case "MESSAGE":
      return typeof data["conversation_id"] === "string"
        ? `/messages?c=${data["conversation_id"]}`
        : "/messages";
    case "REVIEW":
      return "/studio";
    default:
      return "/dashboard";
  }
}

async function storeToken(token: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: auth.user.id,
        token,
        platform: nativePlatform(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
}

/** Removes this device's token — call on sign-out so pushes stop. */
export async function unregisterPushDevice(token: string | null) {
  if (!token) return;
  await supabase.from("push_tokens").delete().eq("token", token);
}

/**
 * Asks for notification permission and registers the device.
 * Returns the token on native, or null on web / when declined.
 */
export async function registerPushDevice(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (!isNativeApp()) {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      /* notifications unsupported */
    }
    return null;
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let status = await PushNotifications.checkPermissions();
    if (status.receive === "prompt" || status.receive === "prompt-with-rationale") {
      status = await PushNotifications.requestPermissions();
    }
    if (status.receive !== "granted") return null;

    const token = await new Promise<string | null>((resolve) => {
      let settled = false;
      void PushNotifications.addListener("registration", (t) => {
        if (settled) return;
        settled = true;
        resolve(t.value);
      });
      void PushNotifications.addListener("registrationError", () => {
        if (settled) return;
        settled = true;
        resolve(null);
      });
      void PushNotifications.register();
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 10_000);
    });

    if (token) await storeToken(token);
    return token;
  } catch {
    return null;
  }
}

/** Shows a notification on the device (native local notification or web). */
export async function showDeviceNotification(title: string, body: string): Promise<void> {
  if (typeof window === "undefined") return;

  if (isNativeApp()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const asked = await LocalNotifications.requestPermissions();
        if (asked.display !== "granted") return;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 2_000_000_000),
            title,
            body,
            smallIcon: "ic_stat_icon_config_sample",
          },
        ],
      });
    } catch {
      /* local notifications unavailable */
    }
    return;
  }

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  } catch {
    /* blocked */
  }
}

/**
 * Registers the device once per session and mirrors new backend notifications
 * to the OS. Safe to mount anywhere inside the authenticated shell.
 */
export function usePushNotifications(enabled = true) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;

    void registerPushDevice().then((token) => {
      if (!cancelled) tokenRef.current = token;
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase
        .channel(`push-feed-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${data.user.id}`,
          },
          (payload) => {
            const row = payload.new as { category?: string; title?: string; body?: string };
            if (!row?.title || !isPushCategory(row.category ?? "")) return;
            void showDeviceNotification(row.title, row.body ?? "");
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return tokenRef;
}
