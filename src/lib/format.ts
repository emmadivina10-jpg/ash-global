export const ACTIVATION_FEE = 5000;
export const COMMISSIONS = { 1: 1500, 2: 750, 3: 250 } as const;
export const MIN_WITHDRAWAL = 1000;

export function formatXAF(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} XAF`;
}

export function formatSignedXAF(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : ""}${formatXAF(n)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function referralLink(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/register?ref=${code}`;
}

export const CM_PHONE_REGEX = /^(\+?237)?6\d{8}$/;

export function normalizePhone(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function transactionLabel(type: string): string {
  switch (type) {
    case "ACTIVATION_PAYMENT":
      return "Activation payment";
    case "REFERRAL_COMMISSION":
      return "Referral commission";
    case "WITHDRAWAL":
      return "Withdrawal";
    case "WITHDRAWAL_REVERSAL":
      return "Withdrawal reversal";
    default:
      return "Adjustment";
  }
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  MTN_MOMO: "MTN Mobile Money",
  ORANGE_MONEY: "Orange Money",
};
