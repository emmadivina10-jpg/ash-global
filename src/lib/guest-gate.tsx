import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SocialAuth } from "@/components/refer/SocialAuth";
import { Logo } from "@/components/refer/Logo";
import { useI18n } from "@/lib/i18n";

export type GateReason = { en: string; fr: string };

type BrowseAuth = {
  user: User | null;
  isGuest: boolean;
  /**
   * Returns true when the visitor is signed in and the action may proceed.
   * For guests it opens the contextual sign-in dialog and returns false, so
   * callers can simply `if (!requireAuth(...)) return;`.
   */
  requireAuth: (reason?: GateReason) => boolean;
};

const BrowseAuthContext = createContext<BrowseAuth | null>(null);

const DEFAULT_REASON: GateReason = {
  en: "Create a free account or sign in to continue.",
  fr: "Créez un compte gratuit ou connectez-vous pour continuer.",
};

export function BrowseAuthProvider({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const [reason, setReason] = useState<GateReason | null>(null);
  // Current page (path + query + hash) becomes the post-sign-in return path,
  // so members land back exactly where they were acting.
  const href = useRouterState({ select: (s) => s.location.href });

  const requireAuth = useCallback(
    (r?: GateReason) => {
      if (user) return true;
      setReason(r ?? DEFAULT_REASON);
      return false;
    },
    [user],
  );

  const value = useMemo<BrowseAuth>(
    () => ({ user, isGuest: !user, requireAuth }),
    [user, requireAuth],
  );

  return (
    <BrowseAuthContext.Provider value={value}>
      {children}
      <AuthGateDialog
        reason={reason}
        next={href}
        onClose={() => setReason(null)}
        onGo={(to) => {
          setReason(null);
          void navigate({ to, search: { next: href } });
        }}
      />
    </BrowseAuthContext.Provider>
  );
}

/**
 * Guest gate for browsing surfaces. Outside a BrowseAuthProvider (member-only
 * sections) every visitor is signed in by definition, so the gate is a no-op.
 */
export function useAuthGate(): Pick<BrowseAuth, "isGuest" | "requireAuth"> {
  const ctx = useContext(BrowseAuthContext);
  if (ctx) return { isGuest: ctx.isGuest, requireAuth: ctx.requireAuth };
  return { isGuest: false, requireAuth: () => true };
}

/** Full auth state for browsing surfaces; null-safe outside the provider. */
export function useBrowseAuth(): BrowseAuth {
  const ctx = useContext(BrowseAuthContext);
  if (ctx) return ctx;
  return { user: null, isGuest: false, requireAuth: () => true };
}

function AuthGateDialog({
  reason,
  next,
  onClose,
  onGo,
}: {
  reason: GateReason | null;
  next: string;
  onClose: () => void;
  onGo: (to: "/login" | "/register") => void;
}) {
  const { tx } = useI18n();
  return (
    <Dialog open={reason !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex justify-center">
            <Logo compact />
          </div>
          <DialogTitle className="text-xl">
            {tx("Join ASH Glo", "Rejoignez ASH Glo")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {reason ? tx(reason.en, reason.fr) : tx(DEFAULT_REASON.en, DEFAULT_REASON.fr)}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-3">
          <Button
            type="button"
            className="auth-cta h-12 w-full rounded-xl text-base"
            onClick={() => onGo("/register")}
          >
            {tx("Create account", "Créer un compte")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-xl text-base"
            onClick={() => onGo("/login")}
          >
            {tx("Sign in", "Se connecter")}
          </Button>
        </div>
        <SocialAuth label={tx("or continue with", "ou continuez avec")} next={next} />
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-4 block text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {tx("Keep browsing", "Continuer à explorer")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
