# Make TchokoPay the single source of truth for money

## What I found (the 6,000 XAF)
Your wallet is not hardcoded or demo data. It comes from the wallet record, built from real ledger entries:
- 3 referral commissions: +4,500 XAF
- 11 manual "Admin wallet credit" entries (test credit, bonus, compensation, promotion, including one of 6,000): about +12,500 XAF, one already reversed
- 6 completed withdrawals sent through TchokoPay: -8,000 XAF

The manual admin credits were never backed by money received in TchokoPay, which is why the wallet is higher than the 104 XAF really held.

## What I will build
1. **Correct your wallet to 0 XAF** with visible, logged reversal entries (no silent overwrite, no deleted history). Each unbacked admin credit gets a matching "Reversal" line, plus one documented correction line for the remainder so the balance is exactly 0. A second account with 1 XAF and no backing transactions gets the same treatment.
2. **One balance rule**: wallet balance = sum of confirmed ledger entries only. A daily check flags any wallet that differs from its ledger instead of changing it.
3. **TchokoPay merchant balance** read live from TchokoPay on the server, stored with a "Last verified" time. If TchokoPay is down, the dashboard shows the last verified figure labelled as such — never a guessed one.
4. **Reconciliation run** (automatic every hour + "Reconcile now" button for CEO/Finance) that detects missing, duplicate, wrong-amount and status-mismatch payments, wallet/ledger mismatches, and merchant-balance mismatches (merchant balance vs. money ASH owes members). Results and discrepancies are logged with timestamps; nothing is auto-fixed.
5. **Finance dashboard** reorganised into: TchokoPay balance, confirmed revenue, pending, successful, withdrawable funds, member wallet liabilities, platform earnings, provider earnings, withdrawals, reversals, reconciliation status, last sync. Finance Controller sees the same figures from the same source.
6. **Admin credits tightened**: manual credits require a reason and are marked "Unbacked adjustment" so they show up in reconciliation.
7. **Shareholders view** stays restricted: ownership % from the equity records only, revenue and earnings at a high level, and "Valuation not yet established" until a valuation is recorded (no value invented from revenue). No member wallets, transactions or provider details exposed.

## Needs your confirmation
- Reversing your admin credits to reach 0 XAF changes your real account record. The past withdrawals stay as they were (that money was really sent).
- TchokoPay's balance feature: if its connection does not offer a balance read, the dashboard will show "Balance not available from TchokoPay" rather than 104 XAF typed in by hand.

## Technical details
- New tables: `provider_balance_snapshots`, `reconciliation_runs`, `reconciliation_discrepancies` (service-role + deny-all).
- `tchokoPay.getBalance()` added to tchokopay.server.ts; `/api/public/reconcile-finance` scheduled hourly, plus a CEO/Finance-guarded server function.
- Wallet correction via a migration inserting ADJUSTMENT reversal rows through the existing ledger function; `computeFinanceLedger` remains the one shared calculation for Finance and Shareholders.
- Nothing published.
