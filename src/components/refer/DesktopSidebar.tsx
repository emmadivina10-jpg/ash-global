import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";

/** Both browsing shells retain their destinations in a compact, reversible rail. */
export function DesktopSidebar({ children, footer, compactFooter }: { children: ReactNode; footer: ReactNode; compactFooter: ReactNode }) {
  const { tx } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("ash-desktop-sidebar") === "collapsed"); } catch { /* Keep the usable default when storage is unavailable. */ }
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("ash-desktop-sidebar", next ? "collapsed" : "expanded"); } catch { /* Collapse still works without persistence. */ }
  };
  const label = collapsed ? tx("Expand sidebar", "Ouvrir le menu latéral") : tx("Collapse sidebar", "Réduire le menu latéral");
  return <aside data-collapsed={collapsed} aria-label={tx("Desktop navigation", "Navigation ordinateur")} className="desktop-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-sidebar lg:flex">
    <div className="desktop-sidebar-heading flex h-16 shrink-0 items-center justify-between gap-2">
      <Link to="/services" className="desktop-sidebar-expanded-only min-w-0"><Logo /></Link>
      <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} aria-expanded={!collapsed} className="size-10 shrink-0 text-foreground">
          {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
        </Button>
      </TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip></TooltipProvider>
    </div>
    {children}
    <div className="desktop-sidebar-expanded-only mt-auto pt-4">{footer}</div>
    <div className="desktop-sidebar-compact-only mt-auto flex-col items-center gap-3 pb-4 pt-4">{compactFooter}</div>
  </aside>;
}