export const PAYOUT_REMINDER_INTERVAL = 7 * 24 * 60 * 60 * 1000;
export const PAYOUT_REMINDER_DELAY = 2 * 60 * 1000;
export type PayoutReminderPreference = { disabled: boolean; lastShown: number };

export function shouldShowPayoutReminder(
  preference: PayoutReminderPreference,
  now: number,
  connected: boolean,
): boolean {
  return (
    !connected &&
    !preference.disabled &&
    (preference.lastShown === 0 || now - preference.lastShown >= PAYOUT_REMINDER_INTERVAL)
  );
}

export function parsePayoutReminder(raw: string | null): PayoutReminderPreference {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (value && typeof value === "object" && "disabled" in value && "lastShown" in value) {
      return {
        disabled: value.disabled === true,
        lastShown:
          typeof value.lastShown === "number" && Number.isFinite(value.lastShown)
            ? value.lastShown
            : 0,
      };
    }
  } catch {
    /* Corrupt or unavailable local preferences do not block the wallet. */
  }
  return { disabled: false, lastShown: 0 };
}
