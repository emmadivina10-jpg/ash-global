import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Mirrors the proposed public.complete_wallet_topup_stripe (only change: closed statuses refused).
export const PROPOSED_FN = `CREATE OR REPLACE FUNCTION public.complete_wallet_topup_stripe(_payment_reference text, _provider_transaction_id text, _currency text, _amount numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.payment_transactions%ROWTYPE; cur text := upper(coalesce(_currency, ''));
BEGIN
  IF cur !~ '^[A-Z]{3}$' OR cur = 'XAF' OR _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_AMOUNT'); END IF;
  SELECT * INTO r FROM public.payment_transactions WHERE reference = _payment_reference AND purpose = 'WALLET_TOPUP' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_NOT_FOUND'); END IF;
  IF r.status = 'SUCCESS' THEN RETURN jsonb_build_object('ok', true, 'duplicate', true); END IF;
  IF upper(r.status) IN ('REFUNDED','EXPIRED','CANCELLED','CANCELED') OR r.method <> 'CARD' OR r.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'TOPUP_INVALID'); END IF;
  UPDATE public.payment_transactions SET status = 'SUCCESS', completed_at = now(), updated_at = now(),
    provider_reference = COALESCE(provider_reference, NULLIF(_provider_transaction_id, '')), reconciliation_status = 'RECONCILED',
    detail = coalesce(detail, '{}'::jsonb) || jsonb_build_object('settled_currency', cur, 'settled_amount', _amount)
   WHERE id = r.id;
  INSERT INTO public.transactions (user_id, type, amount, currency, reference, description, status)
  VALUES (r.user_id, 'WALLET_TOPUP', _amount, cur, r.reference, 'Wallet top-up (CARD)', 'COMPLETED')
  ON CONFLICT (reference) DO NOTHING;
  INSERT INTO public.wallet_balances (user_id, currency, available, total_in) VALUES (r.user_id, cur, _amount, _amount)
  ON CONFLICT (user_id, currency) DO UPDATE SET available = public.wallet_balances.available + EXCLUDED.available,
    total_in = public.wallet_balances.total_in + EXCLUDED.total_in, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END $function$;`;

const db = new PGlite();
const U = '11111111-1111-1111-1111-111111111111';

beforeAll(async () => {
  await db.exec(`
    CREATE TABLE public.payment_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text UNIQUE, purpose text,
      status text, method text, user_id uuid, completed_at timestamptz, updated_at timestamptz, provider_reference text,
      reconciliation_status text, detail jsonb);
    CREATE TABLE public.transactions (user_id uuid, type text, amount numeric, currency text, reference text UNIQUE, description text, status text);
    CREATE TABLE public.wallet_balances (user_id uuid, currency text, available numeric, total_in numeric, updated_at timestamptz,
      PRIMARY KEY (user_id, currency));
  `);
  await db.exec(PROPOSED_FN);
  for (const [ref, status] of [['T-EXP', 'EXPIRED'], ['T-CAN', 'CANCELLED'], ['T-OK', 'PROCESSING']])
    await db.query(`INSERT INTO payment_transactions(reference,purpose,status,method,user_id) VALUES ($1,'WALLET_TOPUP',$2,'CARD',$3)`, [ref, status, U]);
});
afterAll(async () => { await db.close(); });

const credit = async (ref: string) =>
  (await db.query<{ r: { ok: boolean; error?: string; duplicate?: boolean } }>(
    `SELECT public.complete_wallet_topup_stripe($1,'pi_x','USD',5) AS r`, [ref])).rows[0].r;
const balance = async () =>
  (await db.query<{ a: string | null }>(`SELECT sum(available) AS a FROM wallet_balances WHERE user_id=$1`, [U])).rows[0].a;
const status = async (ref: string) =>
  (await db.query<{ status: string }>(`SELECT status FROM payment_transactions WHERE reference=$1`, [ref])).rows[0].status;

describe('card wallet top-up crediting', () => {
  it('rejects an expired top-up without credit', async () => {
    expect(await credit('T-EXP')).toEqual({ ok: false, error: 'TOPUP_INVALID' });
    expect(await status('T-EXP')).toBe('EXPIRED');
    expect(await balance()).toBeNull();
  });
  it('rejects a cancelled top-up without credit', async () => {
    expect(await credit('T-CAN')).toEqual({ ok: false, error: 'TOPUP_INVALID' });
    expect(await status('T-CAN')).toBe('CANCELLED');
    expect(await balance()).toBeNull();
  });
  it('credits a valid paid top-up exactly once, duplicates do not credit again', async () => {
    expect(await credit('T-OK')).toEqual({ ok: true });
    expect(await credit('T-OK')).toEqual({ ok: true, duplicate: true });
    expect(await credit('T-OK')).toEqual({ ok: true, duplicate: true });
    expect(Number(await balance())).toBe(5);
    const tx = await db.query(`SELECT 1 FROM transactions WHERE reference='T-OK'`);
    expect(tx.rows.length).toBe(1);
  });
});
