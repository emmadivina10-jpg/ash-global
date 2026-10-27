/**
 * Push / device notifications.
 *
 * Important account events (withdrawal decisions, activation verification,
 * referral commissions, bookings and chat) are written server-side into the
 * `notifications` table by database triggers. This module turns those rows into
 * something the member actually sees outside the app:
 *
 *  - native (Capacitor): registers with APNs / FCM and stores the token;
 *    native remote push owns the banner, without a duplicate local alert;
 *  - web: uses the browser Notification API when the member grants permission.
 *
 * Everything degrades to a no-op when the platform or permission is missing.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "@/lib/native";
import { playMessageSound } from "@/lib/sound";
import { shouldMirrorDeviceAlert } from "./notification-delivery";

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
    case "SECURITY_UPDATE":
      return typeof data["bulletin_id"] === "string"
        ? `/security-update/${data["bulletin_id"]}`
        : "/notifications";
    case "WITHDRAWAL":
      return "/withdraw";
    case "ACTIVATION":
      return "/dashboard";
    case "COMMISSION":
      return "/network";
    case "BOOKING":
      return "/bookings";
    case "ASH_CLEAN":
      return typeof data["order_id"] === "string" ? `/clean/orders/${data["order_id"]}` : "/clean";
    case "SUPPORT":
      return "/messages?c=ash-support";
    case "MESSAGE":
      return typeof data["conversation_id"] === "string"
        ? `/messages?c=${data["conversation_id"]}`
        : "/messages";
    case "REVIEW":
      return "/studio";
    case "SOCIAL_LIKE":
    case "SOCIAL_REACTION":
    case "SOCIAL_REPOST":
    case "SOCIAL_COMMENT":
    case "SOCIAL_REPLY":
    case "COMMENT_REACTION":
      // Open the exact post the notification is about whenever we know it.
      return typeof data["post_id"] === "string" ? `/post/${data["post_id"]}` : "/feed";
    case "STORY":
    case "STORY_REACTION":
      return "/feed";
    case "SPOTLIGHT_REACTION":
    case "SPOTLIGHT_COMMENT":
      return typeof data["spotlight_id"] === "string"
        ? `/spotlight?open=post:${data["spotlight_id"]}`
        : "/spotlight";
    case "PROFILE_VIEW":
      return typeof data["viewer_id"] === "string" ? `/u/${data["viewer_id"]}` : "/notifications";
    case "WALLET":
      return "/wallet";
    case "ACCOUNT":
      return "/profile";
    case "DEAL":
      return "/deals";
    case "PROPERTY":
      return typeof data["listing_id"] === "string"
        ? `/property/${data["listing_id"]}`
        : "/property";
    case "FRIEND_REQUEST":
    case "FRIEND_ACCEPTED":
      return "/friends";
    case "GROUP_ADDED":
      return typeof data["conversation_id"] === "string"
        ? `/messages?c=${data["conversation_id"]}`
        : "/groups";
    default:
      return "/feed";
  }
}

async function storeToken(token: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("push_tokens").upsert(
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

/** Short buzz pattern used when a new notification lands. */
export const NOTIFICATION_VIBRATION: number[] = [0, 180, 90, 180];

/** Vibrates the device (native haptics, or the web Vibration API). */
export async function vibrateDevice(pattern: number[] = NOTIFICATION_VIBRATION): Promise<void> {
  if (typeof window === "undefined") return;

  if (isNativeApp()) {
    try {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
      return;
    } catch {
      /* haptics unavailable — fall through to web */
    }
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* vibration blocked */
  }
}

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Shows the unread count on the installed app icon (1, 2, 3 …).
 * Works for installed PWAs / home-screen bookmarks via the Badging API and on
 * native builds via the badge plugin. No-ops where unsupported.
 */
export async function setAppBadgeCount(count: number): Promise<void> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  const safe = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  const nav = navigator as BadgeNavigator;
  try {
    if (safe > 0 && typeof nav.setAppBadge === "function") {
      await nav.setAppBadge(safe);
    } else if (typeof nav.clearAppBadge === "function") {
      await nav.clearAppBadge();
    }
  } catch {
    /* badging blocked */
  }

  if (!isNativeApp()) return;
  try {
    const { Badge } = await import("@capawesome/capacitor-badge");
    if (safe > 0) await Badge.set({ count: safe });
    else await Badge.clear();
  } catch {
    /* badge plugin not installed */
  }
}

/** Keeps the app-icon badge in sync with the unread notification count. */
export function useAppBadge(unreadCount: number) {
  useEffect(() => {
    void setAppBadgeCount(unreadCount);
  }, [unreadCount]);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
}

/**
 * Builds the notification picture: the sender's round photo with a small
 * round ASH logo on its bottom-right. Falls back to the ASH icon.
 */
async function notificationIconFor(row: IncomingNotification, me: string): Promise<string> {
  const fallback = "/favicon.png";
  try {
    const { actorIdFor, loadActors } = await import("@/lib/notification-actor");
    const { resolveAvatarUrl } = await import("@/components/refer/AvatarUpload");
    const ashLogo = (await import("@/assets/ash-logo.png.asset.json")).default;
    const actorId = await actorIdFor(row, me);
    const actor = actorId ? (await loadActors([actorId])).get(actorId) : undefined;
    const photo = actor?.avatar_url ? await resolveAvatarUrl(actor.avatar_url) : null;
    if (!photo) return fallback;
    const [face, logo] = await Promise.all([loadImage(photo), loadImage(ashLogo.url)]);
    const size = 192;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    drawCircle(ctx, face, 0, 0, size);
    const badge = 72;
    const bx = size - badge;
    const by = size - badge;
    ctx.beginPath();
    ctx.arc(bx + badge / 2, by + badge / 2, badge / 2 + 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    drawCircle(ctx, logo, bx, by, badge);
    return canvas.toDataURL("image/png");
  } catch {
    return fallback;
  }
}

/** Shows a notification on the device (native local notification or web). */
export async function showDeviceNotification(
  title: string,
  body: string,
  icon = "/favicon.png",
): Promise<void> {
  if (typeof window === "undefined") return;

  void vibrateDevice();

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
      new Notification(title, { body, icon, badge: "/favicon.png", silent: false });
    }
  } catch {
    /* blocked */
  }
}

/**
 * Registers the device once per session and mirrors new backend notifications
 * to the OS. Safe to mount anywhere inside the authenticated shell.
 */
export type IncomingNotification = {
  id?: string;
  category?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown> | null;
  actor_id?: string | null;
};

export function usePushNotifications(
  enabled = true,
  onIncoming?: (row: IncomingNotification, me: string) => void,
) {
  const tokenRef = useRef<string | null>(null);
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;

    void registerPushDevice().then((token) => {
      if (!cancelled) tokenRef.current = token;
    });

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const me = data.user.id;
      channel = supabase
        .channel(`push-feed-${me}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${me}`,
          },
          (payload) => {
            const row = payload.new as IncomingNotification;
            // Audible chime while the app is open (muted from Settings if the
            // member prefers silence).
            playMessageSound();
            if (!row?.title) return;
            onIncomingRef.current?.(row, me);
            if (!isPushCategory(row.category ?? "")) return;
            if (!shouldMirrorDeviceAlert(isNativeApp(), document.visibilityState)) return;
            void (async () => {
              const icon = await notificationIconFor(row, me);
              void showDeviceNotification(row.title ?? "", row.body ?? "", icon);
            })();
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
