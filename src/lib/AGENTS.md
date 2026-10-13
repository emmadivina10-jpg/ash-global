# src/lib rules
- Stripe booking releases use a durable service-only webhook inbox and release ledger, source-charge evidence, helper-level live-execution gates and default-off database controls; transfer and bank payout are distinct states, and payout events read current state under connected-account scope. Why: wallet balances cannot prove money moved, stale events cannot prove payout state and ambiguous requests must reconcile rather than repay.
- Stripe webhook and reconciliation fixture tests replace the server database and Stripe modules and forbid network access; real SQL validation requires positively confirmed backend isolation. Why: preview and drafts may share production, so fixture success cannot prove database concurrency or real delivery.
- Card bookings confirm via the signed webhook or a server Stripe read of their own Checkout session (reference/amount/currency match) through settleCollection. Why: no ASH webhook on TD yet; never trust the browser.

- Navigation unread badges use exact RLS-scoped head-only message counts, realtime/poll and read-success invalidation. Why: accurate alerts without full inbox downloads.
