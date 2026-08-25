import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, User2 } from "lucide-react";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type NetworkNode = {
  id: string;
  parent_id: string | null;
  level: number;
  account_status: string;
  joined_at: string;
  commission: number;
};

type TreeNode = NetworkNode & { children: TreeNode[] };

export function NetworkTree({
  nodes,
  currentUserStatus,
  currentUserId,
}: {
  nodes: NetworkNode[];
  currentUserStatus: string;
  currentUserId: string;
}) {
  const { t } = useI18n();
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  const tree = useMemo(() => buildTree(nodes, currentUserId), [nodes, currentUserId]);

  const visibleChildren = useMemo(() => {
    if (!levelFilter) return tree.children;
    return tree.children.filter((n) => n.level === levelFilter);
  }, [tree.children, levelFilter]);

  const totalCommission = useMemo(
    () => nodes.reduce((sum, n) => sum + (n.account_status === "ACTIVE" ? n.commission : 0), 0),
    [nodes],
  );
  const activeCount = useMemo(() => nodes.filter((n) => n.account_status === "ACTIVE").length, [nodes]);

  return (
    <section className="surface-card overflow-hidden p-5 sm:p-6">
      <header className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t("net.tree.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("net.tree.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[null, 1, 2, 3].map((lvl) => (
            <button
              key={lvl ?? "all"}
              onClick={() => setLevelFilter(lvl)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                levelFilter === lvl
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {lvl ? t("net.level", { n: lvl }) : t("net.tree.filter.all")}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="tile p-3">
          <p className="eyebrow text-muted-foreground">{t("net.members")}</p>
          <p className="tabular mt-1 text-xl font-bold text-foreground">{nodes.length}</p>
        </div>
        <div className="tile p-3">
          <p className="eyebrow text-muted-foreground">{t("net.activeMembers")}</p>
          <p className="tabular mt-1 text-xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="tile p-3 sm:col-span-1 col-span-2">
          <p className="eyebrow text-muted-foreground">{t("net.tree.earnings")}</p>
          <p className="tabular mt-1 text-xl font-bold text-success">{formatXAF(totalCommission)}</p>
        </div>
      </div>

      <div className="relative">
        <RootNode status={currentUserStatus} />
        <div className="mt-3 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          {visibleChildren.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              {t("net.tree.empty")}
            </p>
          ) : (
            visibleChildren.map((child) => <NodeBranch key={child.id} node={child} depth={0} />)
          )}
        </div>
      </div>

    </section>
  );
}

function RootNode({ status }: { status: string }) {
  const { t } = useI18n();
  const active = status === "ACTIVE";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
      <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
        <span className="text-xs font-bold">{t("net.tree.you")}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{t("net.tree.rootLabel")}</p>
        <StatusBadge status={active ? "ACTIVE" : "PENDING"} label={active ? t("shell.active") : t("shell.pending")} />
      </div>
    </div>
  );
}

function NodeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const active = node.account_status === "ACTIVE";

  return (
    <div className={cn("relative", depth > 0 && "ml-4 pl-5 border-l border-border")}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border p-3 transition",
          active ? "border-success/20 bg-success/5" : "border-border bg-card",
        )}
      >
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "grid size-7 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-primary/10 hover:text-primary",
            !hasChildren && "invisible",
          )}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
        </button>

        <div
          className={cn(
            "grid size-9 place-items-center rounded-full",
            depth === 0 ? "bg-primary text-primary-foreground" : "bg-gold/20 text-gold-foreground",
          )}
        >
          <User2 className="size-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {t("net.level", { n: node.level })} · {t("net.tree.member")}
          </p>
          <p className="text-xs text-muted-foreground">{t("net.tree.joined", { date: formatDate(node.joined_at) })}</p>
        </div>

        <div className="text-right">
          <StatusBadge status={active ? "ACTIVE" : "PENDING"} label={active ? t("shell.active") : t("shell.pending")} />
          {active && node.commission > 0 ? (
            <p className="mt-1 text-xs font-semibold text-success">+{formatXAF(node.commission)}</p>
          ) : null}
        </div>
      </div>

      {open && hasChildren ? (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <NodeBranch key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildTree(nodes: NetworkNode[], rootId: string): { children: TreeNode[] } {
  const byParent = new Map<string, NetworkNode[]>();
  for (const node of nodes) {
    const parent = node.parent_id ?? rootId;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(node);
  }
  function attach(node: NetworkNode): TreeNode {
    return {
      ...node,
      children: (byParent.get(node.id) ?? []).map(attach),
    };
  }
  return {
    children: (byParent.get(rootId) ?? []).map(attach),
  };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
