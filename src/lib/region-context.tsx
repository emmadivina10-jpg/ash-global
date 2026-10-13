import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { detectCountry } from "@/lib/region.functions";
import { supabase } from "@/integrations/supabase/client";
import { showsMobileMoney, showsReferral } from "@/lib/region";

const OVERRIDE_KEY = "ash.region.override";

type RegionValue = {
  /** Country actually used for gating (override wins for admins). */
  country: string;
  /** Real detected country. */
  detected: string;
  /** True when this viewer is an admin and may switch regions. */
  isAdmin: boolean;
  /** "ALL" = admin sees every country's content. */
  override: string | null;
  setOverride: (value: string | null) => void;
  seesEverything: boolean;
  referralEnabled: boolean;
  mobileMoneyEnabled: boolean;
};

const RegionContext = createContext<RegionValue>({
  country: "CM",
  detected: "CM",
  isAdmin: false,
  override: null,
  setOverride: () => {},
  seesEverything: false,
  referralEnabled: true,
  mobileMoneyEnabled: true,
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const detect = useServerFn(detectCountry);
  const [override, setOverrideState] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["region"],
    queryFn: detect,
    staleTime: 60 * 60 * 1000,
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["region", "isAdmin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data: role } = await supabase.rpc("has_role", {
        _user_id: auth.user.id,
        _role: "admin",
      });
      return Boolean(role);
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setOverrideState(localStorage.getItem(OVERRIDE_KEY));
  }, []);

  const setOverride = useCallback((value: string | null) => {
    if (value) localStorage.setItem(OVERRIDE_KEY, value);
    else localStorage.removeItem(OVERRIDE_KEY);
    setOverrideState(value);
  }, []);

  const value = useMemo<RegionValue>(() => {
    const detected = data?.country ?? "CM";
    const effectiveOverride = isAdmin ? override : null;
    const seesEverything = effectiveOverride === "ALL";
    const country = effectiveOverride && effectiveOverride !== "ALL" ? effectiveOverride : detected;
    return {
      country,
      detected,
      isAdmin,
      override: effectiveOverride,
      setOverride,
      seesEverything,
      referralEnabled: seesEverything || showsReferral(country),
      mobileMoneyEnabled: seesEverything || showsMobileMoney(country),
    };
  }, [data?.country, isAdmin, override, setOverride]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}
