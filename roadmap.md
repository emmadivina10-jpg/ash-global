# Roadmap

- [x] Store TchokoPay webhook signing secret — user declined the secure form for now; webhooks remain safe via API round-trip verification
- [x] Platform payout page: `/console/payout` — withdraw 1% revenue, per-booking status/amount/fee, payout history, balance guard (`platform_payouts` table + `console_platform_payout` RPC)
- [x] Provider dashboard: Studio now shows available-to-withdraw balance, pending payments, net earnings (after 1%), wallet shortcut
- [x] Customer profile page: `/profile` — works for new and existing profiles (fixed previously)
- [ ] End-to-end real booking walkthrough — requires a real MTN MoMo payment; guided steps provided to user
