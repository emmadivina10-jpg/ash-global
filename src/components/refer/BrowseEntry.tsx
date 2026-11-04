import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Root visitors browse Discover first; account prompts remain contextual to protected actions. */
export function RouteIndex() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/discover", replace: true });
  }, [navigate]);
  return null;
}
