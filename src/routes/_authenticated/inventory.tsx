import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Boxes,
  MapPin,
  Package,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MOVEMENT_LABEL,
  ROLE_LABEL,
  canManage,
  canStock,
  db,
  friendlyError,
  stockStatus,
  useInventory,
  useMyBusinesses,
  type InventoryRole,
  type MovementType,
  type Product,
} from "@/lib/inventory.queries";
import { ComingSoon } from "@/components/refer/ComingSoon";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "ASH Business Inventory — Coming soon" },
      { name: "description", content: "Business inventory management is coming soon to ASH Glo." },
      { property: "og:title", content: "ASH Business Inventory — Coming soon" },
      {
        property: "og:description",
        content: "Products, locations and stock history for your business are on the way.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventorySoon,
});

// Inventory is blocked behind a coming soon screen. Point this route back at
// InventoryPage to re-enable the feature.
function InventorySoon() {
  return (
    <ComingSoon
      icon={Boxes}
      eyebrow="ASH INVENTORY"
      titleEn="Business inventory"
      titleFr="Inventaire d'entreprise"
      bodyEn="Multi-business inventory with products, locations and a permanent stock history is coming soon to ASH."
      bodyFr="L'inventaire multi-entreprises avec produits, emplacements et historique permanent des stocks arrive bientôt sur ASH."
      features={[
        { icon: Package, en: "Products and locations", fr: "Produits et emplacements" },
        {
          icon: TrendingUp,
          en: "Permanent stock movements",
          fr: "Mouvements de stocks permanents",
        },
      ]}
    />
  );
}

const NO_DATA = "Insufficient data for this visualization.";
const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function InventoryPage() {
  const { data: businesses, isLoading } = useMyBusinesses();
  const [bizId, setBizId] = useState<string>();
  useEffect(() => {
    if (!bizId && businesses?.[0]) setBizId(businesses[0].business_id);
  }, [businesses, bizId]);
  if (isLoading) return <LoadingState label="Loading inventory…" />;
  if (!businesses?.length)
    return (
      <EmptyState
        title="No business yet"
        description="Inventory is available for registered ASH businesses. Create your business profile from Services, or ask a business owner to add you to their team."
      />
    );
  const biz = (businesses.find((b) => b.business_id === bizId) ?? businesses[0])!;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
            ASH Business · Inventory
          </p>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            {biz.business_name}
          </h1>
          <p className="text-xs text-muted-foreground">Your role: {ROLE_LABEL[biz.role]}</p>
        </div>
        {businesses.length > 1 ? (
          <select
            className={cn(sel, "w-auto")}
            value={biz.business_id}
            onChange={(e) => setBizId(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.business_id} value={b.business_id}>
                {b.business_name}
              </option>
            ))}
          </select>
        ) : null}
      </header>
      <Workspace businessId={biz.business_id} role={biz.role} />
    </div>
  );
}

function Workspace({ businessId, role }: { businessId: string; role: InventoryRole }) {
  const { data, isLoading } = useInventory(businessId);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["inventory", "data", businessId] });
  const [productDialog, setProductDialog] = useState<Product | "new" | null>(null);
  const [moveFor, setMoveFor] = useState<Product | null>(null);

  const computed = useMemo(() => {
    if (!data) return null;
    const qtyByProduct = new Map<string, number>();
    for (const s of data.stock)
      qtyByProduct.set(s.product_id, (qtyByProduct.get(s.product_id) ?? 0) + s.quantity);
    const active = data.products.filter((p) => p.is_active);
    let units = 0,
      value = 0,
      low = 0,
      out = 0;
    const byCat = new Map<string, number>();
    for (const p of active) {
      const q = qtyByProduct.get(p.id) ?? 0;
      units += q;
      value += q * Number(p.buying_price);
      const st = stockStatus(q, Number(p.min_stock));
      if (st === "LOW STOCK") low++;
      if (st === "OUT OF STOCK") out++;
      const cat = data.categories.find((c) => c.id === p.category_id)?.name ?? "Uncategorised";
      byCat.set(cat, (byCat.get(cat) ?? 0) + q * Number(p.buying_price));
    }
    const byLoc = data.locations.map((l) => ({
      name: l.name,
      value: data.stock
        .filter((s) => s.location_id === l.id)
        .reduce(
          (a, s) =>
            a +
            s.quantity *
              Number(data.products.find((p) => p.id === s.product_id)?.buying_price ?? 0),
          0,
        ),
    }));
    return {
      qtyByProduct,
      active,
      units,
      value,
      low,
      out,
      byCat: [...byCat].map(([name, value]) => ({ name, value })),
      byLoc,
    };
  }, [data]);

  if (isLoading || !data || !computed) return <LoadingState label="Loading workspace…" />;
  const name = (id: string, list: { id: string; name: string }[]) =>
    list.find((x) => x.id === id)?.name ?? "—";

  return (
    <Tabs defaultValue="dashboard">
      <TabsList className="flex h-auto flex-wrap justify-start">
        {["dashboard", "products", "locations", "history", "team"].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize">
            {t === "products" ? "Current inventory" : t}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="dashboard" className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi icon={Package} label="Total products" value={String(computed.active.length)} />
          <Kpi icon={Boxes} label="Total units" value={computed.units.toLocaleString("fr-FR")} />
          <Kpi
            icon={Wallet}
            label="Inventory value (at cost)"
            value={formatXAF(computed.value)}
            hint="Stock at buying price — not cash or revenue"
          />
          <Kpi icon={AlertTriangle} label="Low stock" value={String(computed.low)} />
          <Kpi icon={AlertTriangle} label="Out of stock" value={String(computed.out)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title="Inventory value by category"
            data={computed.byCat.filter((x) => x.value > 0)}
          />
          <ChartCard
            title="Inventory value by location"
            data={computed.byLoc.filter((x) => x.value > 0)}
          />
        </div>
        <Card title="Recent movements">
          <MovementList
            rows={data.movements.slice(0, 8)}
            products={data.products}
            locations={data.locations}
          />
        </Card>
      </TabsContent>

      <TabsContent value="products" className="space-y-3">
        {canManage(role) ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setProductDialog("new")}
              disabled={!data.locations.length}
            >
              <Plus className="size-4" />
              Add product
            </Button>
            <QuickAdd
              label="Category"
              onAdd={async (n) =>
                db.from("inventory_categories").insert({ business_id: businessId, name: n })
              }
              onDone={refresh}
            />
          </div>
        ) : null}
        {!data.locations.length ? (
          <p className="text-sm text-muted-foreground">Add a location first (Locations tab).</p>
        ) : null}
        {!data.products.length ? (
          <EmptyState title="No products yet" description="Products you add will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {[
                    "Product",
                    "SKU",
                    "Category",
                    "Stock",
                    "Min",
                    "Buy",
                    "Sell",
                    "Value",
                    "Status",
                    "",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => {
                  const q = computed.qtyByProduct.get(p.id) ?? 0;
                  const st = p.is_active ? stockStatus(q, Number(p.min_stock)) : "INACTIVE";
                  return (
                    <tr
                      key={p.id}
                      className={cn("border-t border-border", !p.is_active && "opacity-50")}
                    >
                      <td className="px-3 py-2 font-semibold">{p.name}</td>
                      <td className="px-3 py-2">{p.sku || "—"}</td>
                      <td className="px-3 py-2">
                        {p.category_id ? name(p.category_id, data.categories) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {q} {p.unit}
                      </td>
                      <td className="px-3 py-2">{Number(p.min_stock)}</td>
                      <td className="px-3 py-2">{formatXAF(p.buying_price)}</td>
                      <td className="px-3 py-2">{formatXAF(p.selling_price)}</td>
                      <td className="px-3 py-2">{formatXAF(q * Number(p.buying_price))}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            st === "IN STOCK"
                              ? "bg-primary/10 text-primary"
                              : st === "INACTIVE"
                                ? "bg-muted"
                                : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {st}
                        </span>
                      </td>
                      <td className="space-x-1 whitespace-nowrap px-3 py-2">
                        {canStock(role) && p.is_active ? (
                          <Button size="sm" variant="outline" onClick={() => setMoveFor(p)}>
                            Stock
                          </Button>
                        ) : null}
                        {canManage(role) ? (
                          <Button size="sm" variant="ghost" onClick={() => setProductDialog(p)}>
                            Edit
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="locations" className="space-y-3">
        {canManage(role) ? <LocationForm businessId={businessId} onDone={refresh} /> : null}
        {data.locations.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-gold" />
              <div>
                <p className="font-semibold">
                  {l.name} <span className="text-xs text-muted-foreground">· {l.kind}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.address || "No address"} ·{" "}
                  {data.stock
                    .filter((s) => s.location_id === l.id)
                    .reduce((a, s) => a + s.quantity, 0)}{" "}
                  units
                </p>
              </div>
            </div>
            {canManage(role) ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const { error } = await db
                    .from("inventory_locations")
                    .update({ is_active: !l.is_active })
                    .eq("id", l.id);
                  if (error) toast.error(friendlyError(error));
                  else refresh();
                }}
              >
                {l.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            ) : null}
          </div>
        ))}
        {!data.locations.length ? (
          <EmptyState
            title="No locations"
            description="Add your main shop, branches or warehouse."
          />
        ) : null}
      </TabsContent>

      <TabsContent value="history">
        <Card title="Permanent stock history">
          <MovementList
            rows={data.movements}
            products={data.products}
            locations={data.locations}
            detailed
          />
        </Card>
      </TabsContent>

      <TabsContent value="team">
        <Team businessId={businessId} role={role} />
      </TabsContent>

      {productDialog ? (
        <ProductDialog
          businessId={businessId}
          product={productDialog === "new" ? null : productDialog}
          categories={data.categories}
          locations={data.locations.filter((l) => l.is_active)}
          onClose={() => setProductDialog(null)}
          onDone={refresh}
        />
      ) : null}
      {moveFor ? (
        <MovementDialog
          businessId={businessId}
          product={moveFor}
          locations={data.locations.filter((l) => l.is_active)}
          stock={data.stock}
          onClose={() => setMoveFor(null)}
          onDone={refresh}
        />
      ) : null}
    </Tabs>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm">
      <Icon className="size-4 text-gold" />
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-xl font-extrabold text-foreground">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-border bg-card p-4">
      <h2 className="mb-3 font-display font-bold">{title}</h2>
      {children}
    </section>
  );
}
function ChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card title={title}>
      {data.length < 1 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{NO_DATA}</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip formatter={(v: number) => formatXAF(v)} />
              <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function MovementList({
  rows,
  products,
  locations,
  detailed,
}: {
  rows: {
    id: string;
    product_id: string;
    location_id: string;
    movement_type: MovementType;
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    reference: string | null;
    reason: string | null;
    created_at: string;
  }[];
  products: Product[];
  locations: { id: string; name: string }[];
  detailed?: boolean;
}) {
  if (!rows.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No stock movements recorded yet.
      </p>
    );
  return (
    <ul className="divide-y divide-border">
      {rows.map((m) => {
        const p = products.find((x) => x.id === m.product_id);
        const q = Number(m.quantity);
        return (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <div>
              <p className="font-semibold">
                <span className={q >= 0 ? "text-primary" : "text-destructive"}>
                  {q > 0 ? "+" : ""}
                  {q} {p?.unit}
                </span>{" "}
                {p?.name ?? "—"} — {MOVEMENT_LABEL[m.movement_type]}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(m.created_at)} ·{" "}
                {locations.find((l) => l.id === m.location_id)?.name}
                {detailed ? ` · ${Number(m.previous_quantity)} → ${Number(m.new_quantity)}` : ""}
                {m.reference ? ` · Ref ${m.reference}` : ""}
                {m.reason ? ` · ${m.reason}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuickAdd({
  label,
  onAdd,
  onDone,
}: {
  label: string;
  onAdd: (n: string) => Promise<{ error: unknown }>;
  onDone: () => void;
}) {
  const [v, setV] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.trim()) return;
        const { error } = await onAdd(v.trim());
        if (error) toast.error(friendlyError(error));
        else {
          setV("");
          onDone();
          toast.success(`${label} added`);
        }
      }}
    >
      <Input
        className="h-9 w-40"
        placeholder={`New ${label.toLowerCase()}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <Button size="sm" variant="outline" type="submit">
        Add
      </Button>
    </form>
  );
}

function LocationForm({ businessId, onDone }: { businessId: string; onDone: () => void }) {
  const [f, setF] = useState({ name: "", kind: "MAIN", address: "" });
  return (
    <form
      className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        const { error } = await db.from("inventory_locations").insert({
          business_id: businessId,
          name: f.name.trim(),
          kind: f.kind,
          address: f.address || null,
        });
        if (error) toast.error(friendlyError(error));
        else {
          setF({ name: "", kind: "MAIN", address: "" });
          onDone();
        }
      }}
    >
      <Input
        placeholder="Location name"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
      />
      <select className={sel} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
        {["MAIN", "BRANCH", "WAREHOUSE", "OTHER"].map((k) => (
          <option key={k}>{k}</option>
        ))}
      </select>
      <Input
        placeholder="Address (optional)"
        value={f.address}
        onChange={(e) => setF({ ...f, address: e.target.value })}
      />
      <Button type="submit">
        <Plus className="size-4" />
        Add location
      </Button>
    </form>
  );
}

function ProductDialog({
  businessId,
  product,
  categories,
  locations,
  onClose,
  onDone,
}: {
  businessId: string;
  product: Product | null;
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    unit: product?.unit ?? "unit",
    category_id: product?.category_id ?? "",
    default_location_id: product?.default_location_id ?? locations[0]?.id ?? "",
    buying_price: String(product?.buying_price ?? ""),
    selling_price: String(product?.selling_price ?? ""),
    min_stock: String(product?.min_stock ?? "0"),
  });
  const [busy, setBusy] = useState(false);
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        min={0}
        step="any"
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </div>
  );
  async function save(extra: Record<string, unknown> = {}) {
    if (!f.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    const row = {
      name: f.name.trim(),
      sku: f.sku.trim() || null,
      unit: f.unit.trim() || "unit",
      category_id: f.category_id || null,
      default_location_id: f.default_location_id || null,
      buying_price: Number(f.buying_price) || 0,
      selling_price: Number(f.selling_price) || 0,
      min_stock: Number(f.min_stock) || 0,
      ...extra,
    };
    const { error } = product
      ? await db.from("inventory_products").update(row).eq("id", product.id)
      : await db.from("inventory_products").insert({ ...row, business_id: businessId });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Saved");
    onDone();
    onClose();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("name", "Product name")}
          {field("sku", "SKU")}
          {field("unit", "Unit (bag, kg, piece…)")}
          <div className="space-y-1">
            <Label>Category</Label>
            <select
              className={sel}
              value={f.category_id}
              onChange={(e) => setF({ ...f, category_id: e.target.value })}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Default location</Label>
            <select
              className={sel}
              value={f.default_location_id}
              onChange={(e) => setF({ ...f, default_location_id: e.target.value })}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          {field("min_stock", "Minimum stock", "number")}
          {field("buying_price", "Buying price (XAF)", "number")}
          {field("selling_price", "Selling price (XAF)", "number")}
        </div>
        <p className="text-xs text-muted-foreground">
          Stock quantities are changed only by recording a stock movement.
        </p>
        <div className="flex justify-between gap-2">
          {product ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => save({ is_active: !product.is_active })}
            >
              {product.is_active ? "Deactivate" : "Reactivate"}
            </Button>
          ) : (
            <span />
          )}
          <Button disabled={busy} onClick={() => save()}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TYPES: MovementType[] = [
  "OPENING",
  "PURCHASE",
  "SALE",
  "RETURN",
  "DAMAGE",
  "EXPIRED",
  "TRANSFER_OUT",
  "ADJUSTMENT",
  "COUNT",
];

function MovementDialog({
  businessId,
  product,
  locations,
  stock,
  onClose,
  onDone,
}: {
  businessId: string;
  product: Product;
  locations: { id: string; name: string }[];
  stock: { product_id: string; location_id: string; quantity: number }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [type, setType] = useState<MovementType>("PURCHASE");
  const [loc, setLoc] = useState(product.default_location_id ?? locations[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const current =
    stock.find((s) => s.product_id === product.id && s.location_id === loc)?.quantity ?? 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record stock · {product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Movement</Label>
            <select
              className={sel}
              value={type}
              onChange={(e) => setType(e.target.value as MovementType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "TRANSFER_OUT" ? "Transfer to another location" : MOVEMENT_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>
              Location (now {current} {product.unit})
            </Label>
            <select className={sel} value={loc} onChange={(e) => setLoc(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          {type === "TRANSFER_OUT" ? (
            <div className="space-y-1">
              <Label>Destination</Label>
              <select className={sel} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">Choose…</option>
                {locations
                  .filter((l) => l.id !== loc)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>
              {type === "COUNT"
                ? "Counted quantity"
                : type === "ADJUSTMENT"
                  ? "Change (+/−)"
                  : "Quantity"}
            </Label>
            <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Invoice, receipt…"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>
              Reason{" "}
              {["ADJUSTMENT", "DAMAGE", "EXPIRED", "COUNT"].includes(type)
                ? "(required)"
                : "(optional)"}
            </Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <Button
          disabled={busy || !qty}
          onClick={async () => {
            setBusy(true);
            const { error } = await db.rpc("inventory_record_movement", {
              _business: businessId,
              _product: product.id,
              _location: loc,
              _type: type,
              _quantity: Number(qty),
              _reference: ref || null,
              _reason: reason || null,
              _to_location: type === "TRANSFER_OUT" ? to || null : null,
            });
            setBusy(false);
            if (error) {
              toast.error(friendlyError(error));
              return;
            }
            toast.success("Stock recorded");
            onDone();
            onClose();
          }}
        >
          <TrendingUp className="size-4" />
          Record movement
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Team({ businessId, role }: { businessId: string; role: InventoryRole }) {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["inventory", "team", businessId],
    queryFn: async () => {
      const { data: m, error } = await db
        .from("inventory_members")
        .select("id,user_id,role,created_at")
        .eq("business_id", businessId);
      if (error) throw error;
      const ids = (m ?? []).map((x: { user_id: string }) => x.user_id);
      const { data: p } = ids.length
        ? await db.from("public_profiles").select("user_id,full_name,username").in("user_id", ids)
        : { data: [] };
      return (m ?? []).map((x: { id: string; user_id: string; role: InventoryRole }) => ({
        ...x,
        profile: (p ?? []).find((y: { user_id: string }) => y.user_id === x.user_id),
      }));
    },
  });
  const [username, setUsername] = useState("");
  const [newRole, setNewRole] = useState<InventoryRole>("VIEWER");
  const owner = role === "OWNER";
  const roles: InventoryRole[] = ["MANAGER", "INVENTORY_MANAGER", "WAREHOUSE", "VIEWER"];
  return (
    <div className="space-y-3">
      {owner ? (
        <form
          className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const { data: u } = await db
              .from("public_profiles")
              .select("user_id")
              .ilike("username", username.trim().replace(/^@/, ""))
              .maybeSingle();
            if (!u) {
              toast.error("No ASH member with that username.");
              return;
            }
            const { error } = await db
              .from("inventory_members")
              .insert({ business_id: businessId, user_id: u.user_id, role: newRole });
            if (error) {
              toast.error(friendlyError(error));
              return;
            }
            setUsername("");
            refetch();
            qc.invalidateQueries({ queryKey: ["inventory", "businesses"] });
          }}
        >
          <Users className="mt-2 size-4 text-gold" />
          <Input
            className="w-48"
            placeholder="ASH username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <select
            className={cn(sel, "w-auto")}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as InventoryRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <Button type="submit">Add member</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the business owner can manage the team.
        </p>
      )}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <b>Business owner</b> — full access
      </div>
      {(data ?? []).map(
        (m: {
          id: string;
          role: InventoryRole;
          profile?: { full_name?: string; username?: string };
        }) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
          >
            <span>
              <b>{m.profile?.full_name || m.profile?.username || "Member"}</b> —{" "}
              {ROLE_LABEL[m.role]}
            </span>
            {owner ? (
              <span className="flex gap-2">
                <select
                  className={cn(sel, "h-8 w-auto")}
                  value={m.role}
                  onChange={async (e) => {
                    const { error } = await db
                      .from("inventory_members")
                      .update({ role: e.target.value })
                      .eq("id", m.id);
                    if (error) toast.error(friendlyError(error));
                    else refetch();
                  }}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const { error } = await db.from("inventory_members").delete().eq("id", m.id);
                    if (error) toast.error(friendlyError(error));
                    else refetch();
                  }}
                >
                  Remove
                </Button>
              </span>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}
