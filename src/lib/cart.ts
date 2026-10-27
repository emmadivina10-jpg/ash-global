import { useSyncExternalStore } from "react";

/** A saved Market item. Stored on this device per member until they remove it. */
export type CartItem = {
  serviceId: string;
  providerId: string;
  providerName: string;
  title: string;
  price: number; // XAF, per unit
  qty: number;
  image?: string | null;
};

/** Customers pay the listed price; ASH's platform fee is taken from the vendor's share. */
export const CUSTOMER_PLATFORM_FEE_XAF = 0;
export const CUSTOMER_TAX_XAF = 0;

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + Math.max(0, i.price) * Math.max(1, i.qty), 0);
  const fee = CUSTOMER_PLATFORM_FEE_XAF;
  const tax = CUSTOMER_TAX_XAF;
  return { subtotal, fee, tax, total: subtotal + fee + tax, count: items.reduce((s, i) => s + i.qty, 0) };
}

export function addItem(items: CartItem[], item: Omit<CartItem, "qty">, qty = 1): CartItem[] {
  const found = items.find((i) => i.serviceId === item.serviceId);
  if (found) return items.map((i) => (i === found ? { ...i, qty: Math.min(99, i.qty + qty) } : i));
  return [...items, { ...item, qty: Math.max(1, qty) }];
}

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let items: CartItem[] = EMPTY;
let currentUser: string | null = null;
const emit = () => listeners.forEach((l) => l());

async function db() {
  return (await import("@/integrations/supabase/client")).supabase;
}

/** Load the member's saved cart from their account so it follows them on any device. */
async function refresh() {
  const uid = currentUser;
  if (!uid) {
    items = EMPTY;
    emit();
    return;
  }
  const supabase = await db();
  const { data, error } = await supabase
    .from("cart_items")
    .select("service_id, provider_id, provider_name, title, price, qty, image")
    .eq("user_id", uid)
    .order("created_at");
  if (error || uid !== currentUser) return;
  items = (data ?? []).map((r) => ({
    serviceId: r.service_id,
    providerId: r.provider_id,
    providerName: r.provider_name,
    title: r.title,
    price: Number(r.price),
    qty: r.qty,
    image: r.image,
  }));
  emit();
}

export function setCartUser(uid: string | null | undefined) {
  if ((uid ?? null) === currentUser) return;
  currentUser = uid ?? null;
  void refresh();
}

async function save(next: CartItem[]) {
  const uid = currentUser;
  if (!uid) throw new Error("SIGN_IN_REQUIRED");
  const prev = items;
  items = next;
  emit();
  const supabase = await db();
  const removed = prev.filter((p) => !next.some((n) => n.serviceId === p.serviceId));
  const ops = [];
  if (removed.length)
    ops.push(
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
        .in("service_id", removed.map((r) => r.serviceId)),
    );
  if (next.length)
    ops.push(
      supabase.from("cart_items").upsert(
        next.map((i) => ({
          user_id: uid,
          service_id: i.serviceId,
          provider_id: i.providerId,
          provider_name: i.providerName,
          title: i.title,
          price: i.price,
          qty: i.qty,
          image: i.image ?? null,
        })),
        { onConflict: "user_id,service_id" },
      ),
    );
  const results = await Promise.all(ops);
  if (results.some((r) => r.error)) {
    await refresh();
    throw new Error("CART_SAVE_FAILED");
  }
}

export const cart = {
  add: (item: Omit<CartItem, "qty">, qty = 1) => save(addItem(items, item, qty)),
  setQty: (serviceId: string, qty: number) =>
    save(
      qty <= 0
        ? items.filter((i) => i.serviceId !== serviceId)
        : items.map((i) => (i.serviceId === serviceId ? { ...i, qty: Math.min(99, qty) } : i)),
    ),
  remove: (serviceId: string) => save(items.filter((i) => i.serviceId !== serviceId)),
  removeMany: (ids: string[]) => save(items.filter((i) => !ids.includes(i.serviceId))),
  clear: () => save([]),
  refresh,
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => EMPTY,
  );
}
