import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const repair = `ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
CHECK (type = ANY (ARRAY[
  'ACTIVATION_PAYMENT', 'REFERRAL_COMMISSION', 'WITHDRAWAL',
  'WITHDRAWAL_REVERSAL', 'ADJUSTMENT', 'WALLET_TOPUP',
  'PLATFORM_FEE', 'BOOKING_EARNING', 'PLATFORM_FEE_REVERSAL', 'BOOKING_REVERSAL'
]::text[]));`;

beforeAll(async () => {
  await db.exec(`CREATE TABLE public.transactions (
    type text NOT NULL,
    CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY[
      'ACTIVATION_PAYMENT', 'REFERRAL_COMMISSION', 'WITHDRAWAL',
      'WITHDRAWAL_REVERSAL', 'ADJUSTMENT', 'WALLET_TOPUP'
    ]::text[]))
  );`);
  await expect(db.query("INSERT INTO transactions(type) VALUES ('BOOKING_EARNING')"))
    .rejects.toMatchObject({ code: '23514' });
  await db.exec(repair);
});
afterAll(async () => { await db.close(); });

describe('booking transaction constraint repair on isolated PostgreSQL', () => {
  it.each(['PLATFORM_FEE', 'BOOKING_EARNING', 'PLATFORM_FEE_REVERSAL', 'BOOKING_REVERSAL'])
    ('permits the existing booking trigger transaction %s', async (type) => {
      const result = await db.query<{ type: string }>('INSERT INTO transactions(type) VALUES ($1) RETURNING type', [type]);
      expect(result.rows).toEqual([{ type }]);
    });
  it.each(['ACTIVATION_PAYMENT', 'REFERRAL_COMMISSION', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADJUSTMENT', 'WALLET_TOPUP'])
    ('preserves the existing transaction type %s', async (type) => {
      const result = await db.query<{ type: string }>('INSERT INTO transactions(type) VALUES ($1) RETURNING type', [type]);
      expect(result.rows).toEqual([{ type }]);
    });
  it('continues rejecting unknown transaction types', async () => {
    await expect(db.query("INSERT INTO transactions(type) VALUES ('FAKE_PAYMENT')"))
      .rejects.toMatchObject({ code: '23514' });
  });
  it('does not create financial entries when the repair is reapplied', async () => {
    const before = await db.query('SELECT count(*) FROM transactions');
    await db.exec(repair);
    expect((await db.query('SELECT count(*) FROM transactions')).rows).toEqual(before.rows);
  });
});