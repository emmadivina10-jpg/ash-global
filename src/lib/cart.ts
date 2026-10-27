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

const KEY = (uid: string | null | undefined) => `ash-cart:v1:${uid ?? "guest"}`;
const listeners = new Set<() => void>();
let cache: { key: string; raw: string | null; items: CartItem[] } | null = null;
let currentUser: string | null = null;

function read(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  const key = KEY(currentUser);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (cache && cache.key === key && cache.raw === raw) return cache.items;
  let items: CartItem[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) items = parsed.filter((i) => i && typeof i.serviceId === "string");
  } catch {
    items = [];
  }
  cache = { key, raw, items };
  return items;
}
const EMPTY: CartItem[] = [];

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY(currentUser), JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key?.startsWith("ash-cart:")) listeners.forEach((l) => l());
  });
}

export function setCartUser(uid: string | null | undefined) {
  if ((uid ?? null) === currentUser) return;
  currentUser = uid ?? null;
  listeners.forEach((l) => l());
}

export const cart = {
  add: (item: Omit<CartItem, "qty">, qty = 1) => write(addItem(read(), item, qty)),
  setQty: (serviceId: string, qty: number) =>
    write(
      qty <= 0
        ? read().filter((i) => i.serviceId !== serviceId)
        : read().map((i) => (i.serviceId === serviceId ? { ...i, qty: Math.min(99, qty) } : i)),
    ),
  remove: (serviceId: string) => write(read().filter((i) => i.serviceId !== serviceId)),
  clear: () => write([]),
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}
