import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type InventoryRole = "OWNER" | "MANAGER" | "INVENTORY_MANAGER" | "WAREHOUSE" | "VIEWER";
export type MovementType =
  | "OPENING"
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "DAMAGE"
  | "EXPIRED"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "COUNT";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  OPENING: "Opening stock",
  PURCHASE: "Purchase",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGE: "Damage",
  EXPIRED: "Expired",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
  ADJUSTMENT: "Adjustment",
  COUNT: "Physical count",
};
export const ROLE_LABEL: Record<InventoryRole, string> = {
  OWNER: "Business owner",
  MANAGER: "Business manager",
  INVENTORY_MANAGER: "Inventory manager",
  WAREHOUSE: "Warehouse staff",
  VIEWER: "Viewer",
};

export const canManage = (r?: InventoryRole) =>
  r === "OWNER" || r === "MANAGER" || r === "INVENTORY_MANAGER";
export const canStock = (r?: InventoryRole) => canManage(r) || r === "WAREHOUSE";

// Tables are new; cast once to avoid coupling to regenerated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export function useMyBusinesses() {
  return useQuery({
    queryKey: ["inventory", "businesses"],
    queryFn: async () => {
      const { data, error } = await db.rpc("my_inventory_businesses");
      if (error) throw error;
      return (data ?? []) as { business_id: string; business_name: string; role: InventoryRole }[];
    },
  });
}

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category_id: string | null;
  default_location_id: string | null;
  buying_price: number;
  selling_price: number;
  min_stock: number;
  is_active: boolean;
};
export type Location = {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  is_active: boolean;
};
export type Category = { id: string; name: string };
export type Stock = { product_id: string; location_id: string; quantity: number };
export type Movement = {
  id: string;
  product_id: string;
  location_id: string;
  movement_type: MovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
};

export function useInventory(businessId?: string) {
  return useQuery({
    queryKey: ["inventory", "data", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const q = (t: string, cols = "*") => db.from(t).select(cols).eq("business_id", businessId);
      const [p, l, c, s, m] = await Promise.all([
        q("inventory_products").order("name"),
        q("inventory_locations").order("created_at"),
        q("inventory_categories").order("name"),
        q("inventory_stock", "product_id,location_id,quantity"),
        q("inventory_movements").order("created_at", { ascending: false }).limit(500),
      ]);
      for (const r of [p, l, c, s, m]) if (r.error) throw r.error;
      return {
        products: p.data as Product[],
        locations: l.data as Location[],
        categories: c.data as Category[],
        stock: (s.data as Stock[]).map((x) => ({ ...x, quantity: Number(x.quantity) })),
        movements: m.data as Movement[],
      };
    },
  });
}

export function stockStatus(qty: number, min: number) {
  if (qty <= 0) return "OUT OF STOCK";
  if (min > 0 && qty <= min) return "LOW STOCK";
  return "IN STOCK";
}

export function friendlyError(e: unknown) {
  const msg = (e as { message?: string })?.message ?? "";
  const map: Record<string, string> = {
    NOT_AUTHORIZED: "You don't have permission for this action.",
    INSUFFICIENT_STOCK: "Not enough stock at this location.",
    REASON_REQUIRED: "Please give a reason.",
    INVALID_QUANTITY: "Enter a valid quantity.",
    OPENING_ALREADY_RECORDED:
      "Opening stock was already recorded here — use an adjustment or count.",
    INVALID_DESTINATION: "Choose a different destination location.",
    PRODUCT_NOT_FOUND: "Product not found or inactive.",
    LOCATION_NOT_FOUND: "Location not found or inactive.",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  if (msg.includes("duplicate")) return "That name or SKU already exists.";
  return "Something went wrong. Please try again.";
}
