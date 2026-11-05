/** Paid channel features stay closed until private delivery and verified settlement exist. */
export const CAMPUS_CHANNEL_POLICY = {
  purchasesEnabled: false,
  membershipsEnabled: false,
  liveEnabled: false,
  platformCommission: 0.15,
  creatorShare: 0.85,
  individualPricing: true,
  bundlePricing: true,
} as const;

export function videoOrientation(width: number, height: number) {
  return width > 0 && height > width ? "portrait" : "landscape";
}
