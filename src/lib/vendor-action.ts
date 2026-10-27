/** Food vendors take orders, service vendors take bookings, everyone else sells. */
export function vendorAction(category: string | null | undefined): "order" | "book" | "buy" {
  if (category === "PRIVATE_CHEF" || category === "CATERING") return "order";
  if (!category || category === "OTHER" || category === "DECORATION") return "buy";
  return "book";
}
