import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.2 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M16.36 12.72c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.79-.41 6.92 1.15 9.18.77 1.11 1.68 2.35 2.87 2.3 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.12 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.4-.92-2.41-3.69ZM14.1 5.03c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.77-.96 2.81 1.01.08 2.05-.51 2.69-1.28Z" />
    </svg>
  );
}

export function SocialAuth({ label }: { label: string }) {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function signIn(provider: "google" | "apple") {
    setPending(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if ("error" in result && result.error) {
        toast.error(result.error.message || "Could not start sign in. Please try again.");
        setPending(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start sign in.");
      setPending(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full"
          disabled={pending !== null}
          onClick={() => void signIn("google")}
        >
          {pending === "google" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <GoogleIcon />
          )}
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full"
          disabled={pending !== null}
          onClick={() => void signIn("apple")}
        >
          {pending === "apple" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <AppleIcon />
          )}
          Apple
        </Button>
      </div>
    </div>
  );
}
