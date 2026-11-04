# PROPOSED — NOT APPLIED. Payment security pre-phase repairs

Awaiting explicit approval. No code, migration, cron job, commission or financial record has been changed.

Read-only production facts (2026-11-04):
- Webhook failures logged for TOP-/EVT-/PRM- references: **0**. Pending event tickets: **0**, pending promotions: **0**, pending top-ups: **0**. Nothing is stuck today; this is preventive.
- `marketplace_settings.commission_rate` = **0.15** (column default 0.15, last set by Super admin 2026-10-11). Bookings saved at 12%: **0**; at 15%: **4**.
- Cron `ash-payment-reconcile` (every 5 min) calls the **-dev preview** address with **no secret header**.

---

## 1. TchokoPay webhook misrouting

**Defect** (`src/routes/api/public/webhooks/tchokopay.ts` lines 62–138): the collection branch has its own prefix routing for CLN-/BKG-/PLK-/VER- and sends everything else to `complete_activation`. So a verified PAID callback for
- `TOP-` (wallet top-up), `EVT-` (event ticket), `PRM-` (promotion) → calls `complete_activation`, which finds no activation → error → 500 → TchokoPay retries forever; the item is only settled if the member's screen polls.
- FAILED/CANCELLED for those (and for VER-) → writes to `activations` (no-op) instead of `fail_event_ticket` / `fail_promotion` / verification.
- Successful webhooks don't update the central `payment_transactions` ledger for those kinds.

`settleCollection()` in `src/lib/payment-settlement.server.ts` already routes every prefix correctly, is idempotent, writes `payment_events`, and mirrors the ledger. It is what polling and reconcile already use.

**Fix (code only, no SQL):** after the existing signature/timestamp verification, replace lines 62–183 with one call:

```ts
const { settleCollection } = await import("@/lib/payment-settlement.server");
const outcome = await settleCollection({
  merchantReference,
  providerReference: result.providerReference ?? null,
  status,
  source: "WEBHOOK",
  signatureVerified: true,
});
return Response.json(
  { ok: outcome.ok, type: "collection", status },
  { status: outcome.ok ? 200 : 500 },
);
```
Disbursement branch (withdrawals/payouts) is untouched. Signature check is untouched. Response no longer echoes the reference.

**Impact:** top-ups credit, tickets confirm and promotions activate on the callback itself; failed ones are marked failed instead of hanging. Same database functions as today → no double-credit (each `complete_*` is idempotent on the reference). Bookings/links/activations/verifications behave identically.

## 2. `/api/public/reconcile-activations` — unauthenticated, mutating

**Exact vulnerability:** GET/POST with no caller check (only rate limits 4/min/IP, 6/min global). Any visitor can:
1. Trigger settlement runs, withdrawal finalisation (`console_settle_withdrawal`) and finance reconciliation. Outcomes come from TchokoPay so amounts can't be forged, but an outsider controls timing and burns provider API quota.
2. **Read every pending payment reference and withdrawal reference** in the JSON `results` — information disclosure, and those references are the only "secret" protecting `syncLedgerPayment` (below).
3. Exhaust the global budget (6/min) and **block the real scheduler** — a cheap denial of service on payment settlement.

Also: it only scans activations, bookings, links and clean orders — not event tickets, promotions or top-ups.

**Fix:**
- New private credential `app_private.reconcile_credentials` (same pattern already used for the Spotlight cleanup job), readable only by the database owner and service role.
- Route requires header `x-reconcile-secret`; compared with `timingSafeEqual` against the stored token (read via service role inside the handler). Missing/wrong → 401, no work done. GET removed (POST only).
- Response returns counts only (`checked`, `settled`, `payoutsSettled`) — no references.
- Scan also includes `payment_transactions` rows with provider TCHOKOPAY in PENDING/PROCESSING (covers TOP-/EVT-/PRM-).
- Cron updated to send the header and to call the **published** stable address (operational decision for you — see SQL note).

```ts
// reconcile-activations.ts (core of the change)
async function authorized(request: Request): Promise<boolean> {
  const given = request.headers.get("x-reconcile-secret") ?? "";
  if (!given) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.rpc("reconcile_token_matches", { _token: given });
  return data === true;
}
POST: async ({ request }) => {
  if (!(await authorized(request))) return new Response("Unauthorized", { status: 401 });
  const blocked = await throttled(request); if (blocked) return blocked;
  const r = await reconcile(50);
  return Response.json({ ok: r.ok, checked: r.checked, settled: r.settled,
    payoutsSettled: r.payoutsSettled ?? 0 }, { headers: { "cache-control": "no-store" } });
}
```
(Comparison is done inside the database with a constant-time-safe equality on hashes so the token never leaves the database.)

## 3. `syncLedgerPayment` (server function) — unauthenticated

Used by `WalletTopupDialog` (signed-in) and `/pay/$code` (payer may be a guest).

**Exact vulnerability:** no auth, no ownership check, no rate limit. Anyone holding a reference (leaked e.g. by item 2) can learn its status/method and trigger provider calls + settlement. It cannot fake a payment (only provider-verified outcomes settle), so it's disclosure + abuse, not theft.

**Fix:**
- Rows with `user_id` set (top-ups, member payments): require a signed-in caller whose id equals `user_id`; otherwise return `NOT_FOUND` (no existence leak).
- Rows with `purpose = PAYMENT_LINK` (guest payers): require the link `code` too, and it must match `purpose_ref`'s link; plus `guardPublicRequest` 10/min/IP.
- Split into `syncMyLedgerPayment` (auth middleware) and `syncLinkPayment({ code, reference })`; the two callers switch accordingly. Behaviour for real users is unchanged.

## 4. Commission 12% vs 15%

**Authoritative configuration:** `public.marketplace_settings.commission_rate` (single row), changed only through `src/lib/commission.functions.ts` (audited, CEO/Finance). Current value **15%**. Each booking stores its own `commission_rate` at payment and keeps it.

**Where 12% appears:**
- `issue_booking_code()` trigger: `coalesce(NEW.commission_rate, settings_rate, 0.12)` — a fallback used only if the settings row were missing. Never triggered (0 bookings at 12%).
- `register_verified_stripe_booking()` and `src/lib/commission.ts`: 0.12 is an **allowed choice**, not a default — this is correct and stays.
- App fallback (`DEFAULT_COMMISSION_RATE`) is 0.15.

**Fix:** change only the trigger's last-resort fallback from 0.12 to 0.15 so all fallbacks agree. **No rate changes, no booking rows touched.**

---

## Proposed SQL migration (one transaction)

```sql
-- A. Private reconcile credential (never exposed to anon/authenticated)
CREATE TABLE IF NOT EXISTS app_private.reconcile_credentials (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app_private.reconcile_credentials FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reconcile_token_matches(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM app_private.reconcile_credentials
                 WHERE singleton AND token_hash = encode(extensions.digest(_token, 'sha256'), 'hex'));
$$;
REVOKE ALL ON FUNCTION public.reconcile_token_matches(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_token_matches(text) TO service_role;

-- B. Commission fallback alignment (body identical to production except 0.12 -> 0.15)
CREATE OR REPLACE FUNCTION public.issue_booking_code()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE rate numeric; campus_rate numeric; c text; tries int := 0;
BEGIN
  IF NEW.status::text = 'CONFIRMED' AND OLD.status::text IS DISTINCT FROM 'CONFIRMED'
     AND NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE booking_id = NEW.id) THEN
    campus_rate := public.campus_commission_rate(NEW.provider_id);
    IF campus_rate IS NULL THEN
      SELECT commission_rate INTO rate FROM public.marketplace_settings WHERE id;
      rate := coalesce(NEW.commission_rate, rate, 0.15);
      NEW.commission_rate := rate;
      NEW.platform_fee := round(NEW.price * rate);
      NEW.provider_amount := NEW.price - round(NEW.price * rate);
    ELSE
      NEW.commission_rate := campus_rate;
    END IF;
    NEW.verification_status := 'ISSUED';
    NEW.provider_transfer_status := 'PENDING_VERIFICATION';
    LOOP
      c := public.generate_booking_code();
      tries := tries + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.booking_verification_codes WHERE code = c) OR tries > 10;
    END LOOP;
    INSERT INTO public.booking_verification_codes (booking_id, client_id, code, expires_at)
    VALUES (NEW.id, NEW.client_id, c, greatest(NEW.scheduled_at, now()) + interval '30 days');
  END IF;
  RETURN NEW;
END $function$;
```

**Separate operational steps after approval (not schema):**
1. Generate a random token; store only its SHA-256 hash in `app_private.reconcile_credentials`; store the raw token for the cron header in `app_private` (as the Spotlight job does).
2. Re-schedule `ash-payment-reconcile` to POST with `x-reconcile-secret`. Address choice for you: keep the -dev preview address (today's behaviour) or switch to the published address `project--27f7580a-…lovable.app` — the latter is recommended so production reconciliation runs production code. Order: publish code → set token → update cron, in one short window. Between publish and cron update, reconcile is paused for ≤5 min; webhooks and member polling still settle.

**Rollback:** restore the previous route files; `DROP FUNCTION public.reconcile_token_matches(text); DROP TABLE app_private.reconcile_credentials;`; re-run `issue_booking_code` with 0.12; restore the old cron command.

## Testing (isolated, no live money)

New `tests/payment-security-fixes.test.ts` (mocked provider + mocked admin client):
1. Webhook TOP-/EVT-/PRM- PAID → `complete_wallet_topup` / `complete_event_ticket` / `complete_promotion` called once; never `complete_activation`.
2. Webhook EVT-/PRM- FAILED → `fail_event_ticket` / `fail_promotion`.
3. Webhook BKG-/PLK-/VER-/CLN-/activation → same RPCs as today (regression).
4. Bad signature → 401, no RPC (existing test retained).
5. Reconcile without/with wrong header → 401 and zero provider/database calls; correct header → 200 with counts only (asserts no `reference` field).
6. syncLedger: other user's top-up → NOT_FOUND, no provider call; owner → status; link with wrong code → NOT_FOUND.
7. PGlite: `issue_booking_code` with settings row present uses 0.15 setting; with saved 0.12 on booking keeps 0.12; with settings row removed falls back to 0.15.
Plus the existing 110 payment-safety and 36 webhook tests must still pass. After deployment: one signed fake-reference webhook (no money) and an unauthenticated reconcile call expecting 401.

## Other observation (no action proposed without approval)
The `ash-story-expiry-cleanup` cron command contains its secret in plain text (visible only to database owners). Recommend moving it to `app_private` like the Spotlight job.
