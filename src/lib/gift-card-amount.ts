export type GiftCardCurrency = "CAD" | "XAF";

/** Returns the amount in CAD cents or whole XAF, without floating-point rounding. */
export function giftCardMinorUnits(value: string, currency: GiftCardCurrency): number | null {
  const input = value.trim();
  if (input.length > 32) return null;
  const match = currency === "CAD" ? /^(\d+)(?:\.(\d{1,2}))?$/.exec(input) : /^(\d+)$/.exec(input);
  if (!match) return null;
  const whole = BigInt(match[1]!);
  const amount =
    currency === "CAD" ? whole * 100n + BigInt((match[2] ?? "").padEnd(2, "0")) : whole;
  return amount > 0n && amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
