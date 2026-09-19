import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedCity } from "./location";

/**
 * ASH activity intelligence (Phase 1).
 *
 * Records meaningful interactions so the recommendation layer has real
 * behavioural data. Events are queued in memory and flushed in small batches
 * so nothing blocks the UI, and every event is re-validated and re-weighted in
 * the database — client-supplied weights and scores are never trusted.
 *
 * Privacy rules enforced here and in the database:
 * - only the signed-in member's own rows are ever written or read,
 * - coarse city/country only, never coordinates, and only when the member has
 *   granted location permission,
 * - no message content, wallet balances, payment data or personal details.
 */

export type ActivityEventType =
  | "impression"
  | "view"
  | "click"
  | "like"
  | "reaction"
  | "comment"
  | "reply"
  | "repost"
  | "save"
  | "share"
  | "unsave"
  | "unlike"
  | "story_view"
  | "story_reaction"
  | "spotlight_view"
  | "spotlight_reaction"
  | "search"
  | "profile_view"
  | "provider_view"
  | "service_view"
  | "category_view"
  | "product_view"
  | "listing_view"
  | "booking"
  | "follow"
  | "friend_request"
  | "hashtag_view"
  | "hide"
  | "report";

export type ActivitySurface =
  | "feed"
  | "stories"
  | "spotlight"
  | "services"
  | "marketplace"
  | "search"
  | "profile"
  | "hashtag"
  | "jobs"
  | "property"
  | "events"
  | "deals"
  | "freelance"
  | "markets"
  | "notifications"
  | "other";

export type ActivityEvent = {
  event_type: ActivityEventType;
  surface: ActivitySurface;
  /** post | story | spotlight | provider | service | listing | profile | hashtag | job ... */
  target_type?: string;
  target_id?: string | null;
  /** Creator / provider owner behind the content. */
  author_id?: string | null;
  category?: string | null;
  hashtags?: string[] | null;
  /** Meaningful viewing time, capped server-side. */
  dwell_ms?: number | null;
  /** Small, non-sensitive extras only (e.g. { query_length: 12 }). */
  metadata?: Record<string, string | number | boolean> | null;
};

const QUEUE: ActivityEvent[] = [];
const MAX_BATCH = 25;
const FLUSH_MS = 4000;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function locationFields() {
  // Only the coarse city label is sent, and only when the member granted
  // location permission. Coordinates never leave the device. The database
  // drops these fields again unless the member's location setting is on.
  const city = getCachedCity();
  return city ? { city } : {};
}

async function flush() {
  if (flushing || QUEUE.length === 0) return;
  flushing = true;
  const batch = QUEUE.splice(0, MAX_BATCH);
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const payload = batch.map((event) => ({ ...event, ...locationFields() }));
    await supabase.rpc("log_activity_events", { _events: payload as never });
  } catch {
    // Tracking must never break a screen. Drop the batch silently.
  } finally {
    flushing = false;
    if (QUEUE.length > 0) schedule();
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
}

/** Queue one activity event. Safe to call from render-adjacent code. */
export function trackEvent(event: ActivityEvent) {
  if (typeof window === "undefined") return;
  QUEUE.push(event);
  if (QUEUE.length >= MAX_BATCH) void flush();
  else schedule();
}

/** Flush immediately (used when the app goes to the background). */
export function flushActivity() {
  void flush();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushActivity();
  });
}

/**
 * Impression + dwell tracking for a card in a list. Fires one impression when
 * the element has been at least half-visible for a moment, then a dwell event
 * with the total visible time when it leaves.
 */
export function useImpression(event: ActivityEvent, enabled = true) {
  const ref = useRef<HTMLElement | null>(null);
  const seen = useRef(false);
  const enteredAt = useRef<number | null>(null);
  const total = useRef(0);
  const payload = useRef(event);
  payload.current = event;

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            enteredAt.current = Date.now();
            if (!seen.current) {
              seen.current = true;
              trackEvent({ ...payload.current, event_type: "impression" });
            }
          } else if (enteredAt.current) {
            total.current += Date.now() - enteredAt.current;
            enteredAt.current = null;
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (enteredAt.current) total.current += Date.now() - enteredAt.current;
      // Only report viewing time that actually means something.
      if (total.current >= 1500) {
        trackEvent({ ...payload.current, event_type: "view", dwell_ms: Math.min(total.current, 600000) });
      }
      total.current = 0;
      enteredAt.current = null;
    };
  }, [enabled]);

  return ref;
}

/** Convenience wrapper for click-through tracking on a list item. */
export function useTrackClick() {
  return useCallback((event: ActivityEvent) => trackEvent({ ...event, event_type: "click" }), []);
}

/**
 * Fires one "view" event for a screen or detail page, once per mount, as soon
 * as the content is ready. Used by detail screens (profile, job, listing,
 * event, project) where an impression observer is not meaningful.
 */
export function useTrackView(event: ActivityEvent, ready = true) {
  const sent = useRef(false);
  const payload = useRef(event);
  payload.current = event;

  useEffect(() => {
    if (!ready || sent.current) return;
    sent.current = true;
    trackEvent({ ...payload.current, event_type: payload.current.event_type ?? "view" });
  }, [ready]);
}
