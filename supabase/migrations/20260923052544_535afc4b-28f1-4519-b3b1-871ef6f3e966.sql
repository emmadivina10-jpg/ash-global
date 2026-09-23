-- lovable-cron-fallback-reviewed: payment provider webhooks can be missed; a 5-minute reconciliation backstop prevents bookings staying stuck in PAYMENT_PROCESSING. User informed of 288 runs/day and cost.
select cron.schedule(
  'ash-payment-reconcile',
  '*/5 * * * *',
  $$SELECT net.http_post(
      url := 'https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app/api/public/reconcile-activations',
      headers := jsonb_build_object('content-type','application/json'),
      body := '{}'::jsonb,
      timeout_milliseconds := 25000
    );$$
);